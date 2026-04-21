import { NextRequest, NextResponse } from 'next/server';
import { generateOAuthUrl } from '@/lib/lark';

const LARK_APP_ID = process.env.LARK_APP_ID;
const LARK_REDIRECT_URI = process.env.LARK_REDIRECT_URI || process.env.NEXT_PUBLIC_BASE_URL + '/api/auth/lark/callback';

const LARK_SCOPES = [
  'approval:approval',
  'approval:approval:readonly',
  'bitable:app',
  'bitable:app:readonly',
  'board:whiteboard:node:create',
  'board:whiteboard:node:delete',
  'board:whiteboard:node:read',
  'board:whiteboard:node:update',
  'contact:contact.base:readonly',
  'contact:user.base:readonly',
  'contact:user.department:readonly',
  'contact:user.department_path:readonly',
  'contact:user.email:readonly',
  'contact:user.employee:readonly',
  'contact:user.employee_id:readonly',
  'contact:user.gender:readonly',
  'contact:user.id:readonly',
  'contact:user.phone:readonly',
  'docs:doc',
  'docs:doc:readonly',
  'docs:document.media:download',
  'docs:document.media:upload',
  'docs:permission.member',
  'docs:permission.member:auth',
  'docs:permission.member:create',
  'docs:permission.member:delete',
  'docs:permission.member:readonly',
  'docs:permission.member:retrieve',
  'docs:permission.member:transfer',
  'docs:permission.member:update',
  'docs:permission.setting',
  'docs:permission.setting:read',
  'docs:permission.setting:readonly',
  'docs:permission.setting:write_only',
  'docx:document',
  'docx:document:readonly',
  'drive:drive',
  'drive:drive.metadata:readonly',
  'drive:drive.search:readonly',
  'drive:drive:readonly',
  'drive:drive:version',
  'drive:drive:version:readonly',
  'drive:export:readonly',
  'drive:file',
  'drive:file.meta.sec_label.read_only',
  'drive:file:readonly',
  'event:ip_list',
  'im:chat',
  'im:chat.announcement:read',
  'im:chat.announcement:write_only',
  'im:chat.chat_pins:read',
  'im:chat.chat_pins:write_only',
  'im:chat.collab_plugins:read',
  'im:chat.collab_plugins:write_only',
  'im:chat.group_info:readonly',
  'im:chat.managers:write_only',
  'im:chat.members:read',
  'im:chat.members:write_only',
  'im:chat.moderation:read',
  'im:chat.tabs:read',
  'im:chat.tabs:write_only',
  'im:chat.top_notice:write_only',
  'im:chat:delete',
  'im:chat:moderation:write_only',
  'im:chat:read',
  'im:chat:readonly',
  'im:chat:update',
  'im:message',
  'im:message.pins:read',
  'im:message.pins:write_only',
  'im:message.reactions:read',
  'im:message.reactions:write_only',
  'im:message:readonly',
  'im:message:recall',
  'im:message:update',
  'sheets:spreadsheet',
  'sheets:spreadsheet:readonly',
  'space:document.event:read',
  'wiki:wiki',
  'wiki:wiki:readonly',
].join(' ');

export async function GET(request: NextRequest) {
  try {
    if (!LARK_APP_ID || !LARK_REDIRECT_URI) {
      return NextResponse.json(
        { error: 'Lark OAuth not configured' },
        { status: 500 }
      );
    }

    const state = crypto.randomUUID();
    const authUrl = generateOAuthUrl(LARK_REDIRECT_URI, state, LARK_SCOPES);
    console.log('Lark auth URL:', authUrl);

    return NextResponse.json({
      success: true,
      authUrl,
      state,
    });
  } catch (error) {
    console.error('Lark auth error:', error);
    return NextResponse.json(
      { error: 'Failed to generate Lark auth URL' },
      { status: 500 }
    );
  }
}
