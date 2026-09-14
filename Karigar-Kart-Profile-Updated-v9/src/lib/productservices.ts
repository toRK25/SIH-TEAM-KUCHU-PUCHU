import { supabase } from './supabase';

export interface ProductInput {
  name: string;
  description?: string;
  category?: string;
  material?: string;
  size?: string;
  craft?: string;
  minimum?: string | number;
  price?: string | number;
  quantity?: string | number;
  delivery?: string;
  photo?: string;
  status?: string;
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: any;
}

export async function fetchProducts(): Promise<ServiceResponse> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching products:', error.message);
    return { success: false, data: [], error };
  }

  return { success: true, data };
}

export async function addProductToSupabase(
  product: ProductInput,
  artisanId: string
): Promise<ServiceResponse> {
  const payload = {
    artisan_id: artisanId,
    name: product.name,
    description: product.description || '',
    category: product.category || '',
    material: product.material || '',
    size: product.size || '',
    craft: product.craft || '',
    minimum: product.minimum ? parseFloat(String(product.minimum)) : null,
    price: product.price ? parseFloat(String(product.price)) : null,
    stock: product.quantity ? parseInt(String(product.quantity), 10) : 1,
    delivery: product.delivery || '',
    image_url: product.photo || '',
    status: product.status || 'Draft'
  };

  const { data, error } = await supabase
    .from('products')
    .insert([payload])
    .select();

  if (error) {
    console.error('Error adding product:', error.message);
    return { success: false, error };
  }

  return { success: true, data: data[0] };
}