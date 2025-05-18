
import { redirect } from 'next/navigation';

// This page will now immediately redirect to the dashboard
// as authentication is being bypassed.
export default function LoginPage() {
  redirect('/admin/dashboard');
  // Unreachable code, but keeps structure if needed later
  // return null; 
}
