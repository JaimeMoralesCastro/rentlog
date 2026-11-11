// Mapea el nombre de icono de cada categoría (categoryConfig.js) al componente
// de lucide-react. Sustituye a los antiguos emojis para una estética coherente.
import { Sparkles, CreditCard, Lightbulb, Wrench, ShoppingBag, Landmark, Package } from 'lucide-react';
import { CATEGORIES } from '../finance/categoryConfig.js';

const ICONS = { Sparkles, CreditCard, Lightbulb, Wrench, ShoppingBag, Landmark, Package };

// Devuelve el componente de icono para una categoría dada.
export function categoryIcon(categoryName) {
  const key = CATEGORIES[categoryName]?.icon;
  return ICONS[key] ?? Package;
}
