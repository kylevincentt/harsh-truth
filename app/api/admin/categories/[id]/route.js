import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../lib/supabase';

function checkAuth(request) {
  return request.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD;
}

export async function PUT(request, { params }) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name } = await request.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const newName = name.trim();

  const { data: existing } = await supabase
    .from('categories')
    .select('name')
    .eq('id', params.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('categories')
    .update({ name: newName })
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A category with that name already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Keep posts in sync with the renamed category
  if (existing.name !== newName) {
    await supabase
      .from('approved_posts')
      .update({ category: newName })
      .eq('category', existing.name);

    await supabase
      .from('submissions')
      .update({ category: newName })
      .eq('category', existing.name);
  }

  return NextResponse.json(data);
}

export async function DELETE(request, { params }) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: cat } = await supabase
    .from('categories')
    .select('name')
    .eq('id', params.id)
    .single();

  if (!cat) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  if (cat.name === 'Other') {
    return NextResponse.json({ error: 'Cannot delete the "Other" category.' }, { status: 400 });
  }

  // Reassign posts before deleting
  await supabase
    .from('approved_posts')
    .update({ category: 'Other' })
    .eq('category', cat.name);

  await supabase
    .from('submissions')
    .update({ category: 'Other' })
    .eq('category', cat.name);

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
