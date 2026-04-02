import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../lib/supabase';
import { getAdminUser } from '../../../../../lib/admin-auth';

export async function PUT(request, { params }) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const { name, colors } = await request.json();

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (!colors || typeof colors !== 'object') {
    return NextResponse.json({ error: 'Colors are required' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('themes')
    .update({ name: name.trim(), colors })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A theme with that name already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request, { params }) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const supabase = createAdminClient();

  // Check if this is the active theme
  const { data: theme } = await supabase
    .from('themes')
    .select('is_active')
    .eq('id', id)
    .single();

  if (theme?.is_active) {
    return NextResponse.json({ error: 'Cannot delete the active theme.' }, { status: 400 });
  }

  const { error } = await supabase
    .from('themes')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
