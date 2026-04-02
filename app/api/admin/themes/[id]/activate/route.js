import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../../lib/supabase';
import { getAdminUser } from '../../../../../../lib/admin-auth';

export async function PUT(request, { params }) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const supabase = createAdminClient();

  // Deactivate all themes, then activate the selected one
  const { error: deactivateError } = await supabase
    .from('themes')
    .update({ is_active: false })
    .neq('id', id);

  if (deactivateError) {
    return NextResponse.json({ error: deactivateError.message }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('themes')
    .update({ is_active: true })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
