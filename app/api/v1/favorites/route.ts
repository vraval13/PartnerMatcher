import { createClient } from "@/lib/supabase/server";
import { addFavorite, listFavorites, removeFavorite } from "@/lib/favorites/http";

export async function GET() {
  return listFavorites(await createClient());
}

export async function POST(request: Request) {
  return addFavorite(await createClient(), request);
}

export async function DELETE(request: Request) {
  return removeFavorite(await createClient(), request);
}
