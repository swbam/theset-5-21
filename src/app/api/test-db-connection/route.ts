import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db'; // Adjust path if necessary

export async function GET() {
  try {
    // Perform a minimal query to test the connection
    const { error, count } = await supabase
      .from('artists') // Use any table that should exist
      .select('id', { count: 'exact', head: true });

    if (error) {
      console.error('Supabase connection test failed:', error);
      return NextResponse.json({ status: 'error', message: 'Supabase connection failed', error: error.message }, { status: 500 });
    }

    console.log('Supabase connection test successful. Count:', count); // Count will likely be null with head:true, but no error means connection is ok.
    return NextResponse.json({ status: 'success', message: 'Supabase connection successful.' });

  } catch (err: any) {
    console.error('Unexpected error during Supabase connection test:', err);
    return NextResponse.json({ status: 'error', message: 'Unexpected server error', error: err.message }, { status: 500 });
  }
}