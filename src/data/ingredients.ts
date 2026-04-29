import type { AllergenId } from "../features/dish-builder/utils/allergens";

export interface Ingredient {
  id: number;
  name: string;
  allergens: AllergenId[];
}

export const INGREDIENTS_DB: Ingredient[] = [
  { id: 1,  name: "Harina de Trigo",          allergens: ["GLUTEN"] },
  { id: 2,  name: "Pan rallado",               allergens: ["GLUTEN"] },
  { id: 3,  name: "Pasta",                     allergens: ["GLUTEN", "HUEVOS"] },
  { id: 4,  name: "Salsa de Soja",             allergens: ["SOJA", "GLUTEN"] },
  { id: 5,  name: "Langostinos",               allergens: ["CRUSTACEOS"] },
  { id: 6,  name: "Gambas",                    allergens: ["CRUSTACEOS"] },
  { id: 7,  name: "Huevo",                     allergens: ["HUEVOS"] },
  { id: 8,  name: "Mayonesa",                  allergens: ["HUEVOS", "MOSTAZA"] },
  { id: 9,  name: "Leche",                     allergens: ["LACTEOS"] },
  { id: 10, name: "Queso",                     allergens: ["LACTEOS"] },
  { id: 11, name: "Mantequilla",               allergens: ["LACTEOS"] },
  { id: 12, name: "Nata",                      allergens: ["LACTEOS"] },
  { id: 13, name: "Cacahuetes",                allergens: ["CACAHUETES"] },
  { id: 14, name: "Salmón",                    allergens: ["PESCADO"] },
  { id: 15, name: "Merluza",                   allergens: ["PESCADO"] },
  { id: 16, name: "Atún",                      allergens: ["PESCADO"] },
  { id: 17, name: "Almendras",                 allergens: ["FRUTOS_DE_CASCARA"] },
  { id: 18, name: "Nueces",                    allergens: ["FRUTOS_DE_CASCARA"] },
  { id: 19, name: "Avellanas",                 allergens: ["FRUTOS_DE_CASCARA"] },
  { id: 20, name: "Pistachos",                 allergens: ["FRUTOS_DE_CASCARA"] },
  { id: 21, name: "Apio",                      allergens: ["APIO"] },
  { id: 22, name: "Mostaza",                   allergens: ["MOSTAZA"] },
  { id: 23, name: "Sésamo",                    allergens: ["SESAMO"] },
  { id: 24, name: "Vino blanco (con sulfitos)", allergens: ["SULFITOS"] },
  { id: 25, name: "Almejas",                   allergens: ["MOLUSCOS"] },
  { id: 26, name: "Mejillones",                allergens: ["MOLUSCOS"] },
  { id: 27, name: "Tofu",                      allergens: ["SOJA"] },
  { id: 28, name: "Ketchup",                   allergens: ["SESAMO", "MOSTAZA"] },
  { id: 29, name: "Aceite de sésamo",          allergens: ["SESAMO"] },
  { id: 30, name: "Altramuces",                allergens: ["ALTRAMUCES"] },
];
