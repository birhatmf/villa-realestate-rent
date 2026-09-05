'use client';

import { req } from './http';

export type FavoriteVilla = {
  id: string;
  slug: string;
  title: string;
  currency: string;
  priceRange: { min: number; max: number };
  region: { name: string; slug: string };
  images: { url: string }[];
};

export const listFavorites = () => req<FavoriteVilla[]>('/favorites');
export const addFavorite = (villaId: string) => req<{ ok: true }>(`/favorites/${villaId}`, { method: 'POST' });
export const removeFavorite = (villaId: string) => req<{ ok: true }>(`/favorites/${villaId}`, { method: 'DELETE' });
