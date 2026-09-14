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
  photo?: string    ; // Holds the image URL once uploaded
  status?: string;
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: any;
}

/**
 * Uploads an image File to Supabase Storage and returns its public URL
 */
export async function uploadProductImage(file: File): Promise<ServiceResponse<string>> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `products/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(filePath, file);

  if (uploadError) {
    console.error('Error uploading image:', uploadError.message);
    return { success: false, error: uploadError };
  }

  // Retrieve the public URL for the uploaded file
  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(filePath);

  return { success: true, data: data.publicUrl };
}

/**
 * Inserts the product record into the database
 */
export async function addProductToSupabase(
  product: ProductInput,
  artisanId: string,
  imageUrl?: string
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
    image_url: imageUrl || product.photo || '',
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