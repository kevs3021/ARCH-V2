import { redirect } from 'next/navigation';
import { getCurrentUserFromCookie } from '@/lib/auth';

export default async function RootPage() {
  const user = await getCurrentUserFromCookie();
  
  if (user) {
    redirect('/home');
  } else {
    redirect('/login');
  }
}