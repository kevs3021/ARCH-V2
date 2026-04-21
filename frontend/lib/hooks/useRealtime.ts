'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export type RealtimePayload<T> = {
  eventType: RealtimeEvent;
  newRecord: T;
  oldRecord: T;
  commit_timestamp: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_PUBLISHABLE_KEY || '';

let browserClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!browserClient && supabaseUrl && supabaseAnonKey) {
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  if (!browserClient) {
    throw new Error('Supabase client not initialized');
  }
  return browserClient;
}

export interface UseRealtimeOptions<T> {
  table: string;
  schema?: string;
  event?: RealtimeEvent[];
  filter?: string;
  initialData?: T[];
  onChange?: (payload: RealtimePayload<T>, currentData: T[]) => T[];
}

export function useRealtime<T extends Record<string, any>>({
  table,
  schema = 'public',
  event = ['INSERT', 'UPDATE', 'DELETE'],
  filter,
  initialData = [],
  onChange,
}: UseRealtimeOptions<T>) {
  const [data, setData] = useState<T[]>(initialData);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleChange = useCallback((payload: RealtimePayload<T>) => {
    setData((currentData) => {
      if (onChange) {
        return onChange(payload, currentData);
      }

      switch (payload.eventType) {
        case 'INSERT':
          return [...currentData, payload.newRecord];
        case 'UPDATE':
          return currentData.map((item) => {
            const primaryKey = Object.keys(item).find(
              (k) => k.includes('id') || k.includes('_id')
            );
            if (primaryKey && item[primaryKey] === payload.newRecord[primaryKey]) {
              return payload.newRecord;
            }
            return item;
          });
        case 'DELETE':
          return currentData.filter((item) => {
            const primaryKey = Object.keys(item).find(
              (k) => k.includes('id') || k.includes('_id')
            );
            if (primaryKey) {
              return item[primaryKey] !== payload.oldRecord[primaryKey];
            }
            return true;
          });
        default:
          return currentData;
      }
    });
  }, [onChange]);

  useEffect(() => {
    let channel: any = null;

    const subscribe = async () => {
      try {
        const client = getSupabaseClient();
        
        const channelName = `${schema}:${table}${filter ? `:${filter}` : ''}`;
        channel = client.channel(channelName);

        channel.on(
          'postgres_changes' as any,
          {
            event: event.join(',') as any,
            schema,
            table,
            filter: filter || undefined,
          },
          (payload: RealtimePayload<T>) => {
            handleChange(payload);
          }
        );

        channel.subscribe((status: string) => {
          console.log(`[Realtime] Channel ${channelName} status:`, status);
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            setError(null);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setError(new Error(`Realtime subscription ${status}`));
            setIsConnected(false);
            console.error(`[Realtime] Channel error for ${channelName}:`, status);
          }
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to subscribe'));
      }
    };

    subscribe();

    return () => {
      if (channel) {
        channel.unsubscribe();
        setIsConnected(false);
      }
    };
  }, [table, schema, event.join(','), filter, handleChange]);

  return {
    data,
    setData,
    isConnected,
    error,
    refresh: () => setData(initialData),
  };
}

export function useRealtimeSingle<T extends Record<string, any>>(
  table: string,
  idField: string,
  idValue: string,
  options?: Omit<UseRealtimeOptions<T>, 'table' | 'filter'>
) {
  return useRealtime<T>({
    ...options,
    table,
    filter: `${idField}=eq.${idValue}`,
  });
}

export function createRealtimeSubscription(
  table: string,
  options?: {
    schema?: string;
    event?: RealtimeEvent[];
    filter?: string;
  }
) {
  const client = getSupabaseClient();
  const channelName = `${options?.schema || 'public'}:${table}${options?.filter ? `:${options.filter}` : ''}`;
  
  const channel = client.channel(channelName);
  
  return {
    channel,
    subscribe: (callback: (payload: RealtimePayload<any>) => void) => {
      return channel.on(
        'postgres_changes' as any,
        {
          event: (options?.event || ['INSERT', 'UPDATE', 'DELETE']).join(',') as any,
          schema: options?.schema || 'public',
          table,
          filter: options?.filter || undefined,
        },
        callback
      ).subscribe();
    },
    unsubscribe: () => channel.unsubscribe(),
  };
}

export default useRealtime;
