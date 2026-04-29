import type { AllergenId } from "../features/dish-builder/utils/allergens";

export interface DbIngredient {
  id: number;
  name: string;
  allergens: AllergenId[];
}

export const INGREDIENTS_DB: DbIngredient[] = [
  // ─── ALTRAMUCES ───
  { id: 101, name: "Altramuces al natural", allergens: ["ALTRAMUCES"] },
  {
    id: 102,
    name: "Frutos secos (con altramuces, según etiquetado)",
    allergens: ["ALTRAMUCES", "FRUTOS_DE_CASCARA"],
  },
  { id: 103, name: "Harina de altramuces", allergens: ["ALTRAMUCES"] },
  {
    id: 104,
    name: "Productos a base de altramuces",
    allergens: ["ALTRAMUCES"],
  },
  { id: 105, name: "Trazas de altramuces", allergens: ["ALTRAMUCES"] },

  // ─── APIO ───
  { id: 201, name: "Apio al natural", allergens: ["APIO"] },
  { id: 202, name: "Aroma de apio", allergens: ["APIO"] },
  { id: 203, name: "Caldo vegetal preparado con apio", allergens: ["APIO"] },
  { id: 204, name: "Derivados del apio", allergens: ["APIO"] },
  { id: 205, name: "Jugo de apio", allergens: ["APIO"] },
  { id: 206, name: "Raíz de apio", allergens: ["APIO"] },
  { id: 207, name: "Trazas de apio", allergens: ["APIO"] },

  // ─── CACAHUETES Y FRUTOS DE CÁSCARA (Agrupados de tus capturas) ───
  {
    id: 301,
    name: "Aceites de frutos secos",
    allergens: ["FRUTOS_DE_CASCARA"],
  },
  {
    id: 302,
    name: "Bombón con frutos secos",
    allergens: ["FRUTOS_DE_CASCARA", "LACTEOS", "SOJA"],
  },
  { id: 303, name: "Cacahuetes, Maní, Arachís", allergens: ["CACAHUETES"] },
  {
    id: 304,
    name: "Cremas con frutos secos",
    allergens: ["FRUTOS_DE_CASCARA", "LACTEOS"],
  },
  { id: 305, name: "Derivados de cacahuetes", allergens: ["CACAHUETES"] },
  {
    id: 306,
    name: "Frutos secos artificiales",
    allergens: ["FRUTOS_DE_CASCARA"],
  },
  {
    id: 307,
    name: "Helados con cacahuetes",
    allergens: ["CACAHUETES", "LACTEOS"],
  },
  {
    id: 308,
    name: "Mantequilla de frutos secos",
    allergens: ["FRUTOS_DE_CASCARA"],
  },
  {
    id: 309,
    name: "Pan de semilla (según etiquetado)",
    allergens: ["GLUTEN", "SESAMO", "FRUTOS_DE_CASCARA"],
  },
  {
    id: 310,
    name: "Productos a base de cacahuetes",
    allergens: ["CACAHUETES"],
  },
  {
    id: 311,
    name: "Productos emulsionados (según etiquetado)",
    allergens: ["CACAHUETES", "SOJA", "HUEVOS"],
  },
  {
    id: 312,
    name: "Proteína vegetal hidrolizada",
    allergens: ["SOJA", "CACAHUETES"],
  },
  {
    id: 313,
    name: "Salsa Barbacoa",
    allergens: ["MOSTAZA", "SULFITOS", "SOJA"],
  },
  {
    id: 314,
    name: "Salsa Inglesa (Perrins/Worcestershire)",
    allergens: ["PESCADO", "SOJA", "GLUTEN"],
  },
  { id: 315, name: "Salsa Pesto", allergens: ["LACTEOS", "FRUTOS_DE_CASCARA"] },
  { id: 316, name: "Satay o Saté", allergens: ["CACAHUETES", "SOJA"] },
  { id: 317, name: "Trazas de cacahuetes", allergens: ["CACAHUETES"] },
  {
    id: 318,
    name: "Turrón con frutos secos",
    allergens: ["FRUTOS_DE_CASCARA", "HUEVOS"],
  },

  // ─── GLUTEN ───
  { id: 401, name: "Agua de cebada", allergens: ["GLUTEN"] },
  { id: 402, name: "Almidones modificados (E-1404...)", allergens: ["GLUTEN"] },
  { id: 403, name: "Amiláceos", allergens: ["GLUTEN"] },
  { id: 404, name: "Avena", allergens: ["GLUTEN"] },
  {
    id: 405,
    name: "Bebidas destiladas (según etiquetado)",
    allergens: ["GLUTEN"],
  },
  {
    id: 406,
    name: "Café y té instantáneos (según etiquetado)",
    allergens: ["GLUTEN"],
  },
  { id: 407, name: "Cebada", allergens: ["GLUTEN"] },
  { id: 408, name: "Centeno", allergens: ["GLUTEN"] },
  { id: 409, name: "Cereales con gluten", allergens: ["GLUTEN"] },
  { id: 410, name: "Cerveza", allergens: ["GLUTEN"] },
  { id: 411, name: "Charcutería con gluten", allergens: ["GLUTEN"] },
  {
    id: 412,
    name: "Chocolates con gluten",
    allergens: ["GLUTEN", "LACTEOS", "SOJA"],
  },
  { id: 413, name: "Cubitos de caldo", allergens: ["GLUTEN", "SOJA", "APIO"] },
  { id: 414, name: "Derivados de cereales con gluten", allergens: ["GLUTEN"] },
  {
    id: 415,
    name: "Dulces, caramelos, helados (según etiquetado)",
    allergens: ["GLUTEN", "LACTEOS"],
  },
  { id: 416, name: "Espelta", allergens: ["GLUTEN"] },
  { id: 417, name: "Espesantes", allergens: ["GLUTEN"] },
  { id: 418, name: "Fécula", allergens: ["GLUTEN"] },
  { id: 419, name: "Fibra", allergens: ["GLUTEN"] },
  { id: 420, name: "Fideos, sémola de trigo", allergens: ["GLUTEN"] },
  { id: 421, name: "Germen de trigo", allergens: ["GLUTEN"] },
  { id: 422, name: "Gluten puro", allergens: ["GLUTEN"] },
  { id: 423, name: "Harina de avena", allergens: ["GLUTEN"] },
  { id: 424, name: "Harina de cebada", allergens: ["GLUTEN"] },
  { id: 425, name: "Harina de centeno", allergens: ["GLUTEN"] },
  { id: 426, name: "Harina de trigo", allergens: ["GLUTEN"] },
  { id: 427, name: "Macarrones", allergens: ["GLUTEN"] },
  { id: 428, name: "Malta", allergens: ["GLUTEN"] },
  {
    id: 429,
    name: "Otras comidas preparadas con gluten",
    allergens: ["GLUTEN"],
  },
  { id: 430, name: "Pan", allergens: ["GLUTEN"] },
  { id: 431, name: "Pan de molde", allergens: ["GLUTEN", "LACTEOS", "SOJA"] },
  { id: 432, name: "Pan rallado", allergens: ["GLUTEN"] },
  { id: 433, name: "Pastas", allergens: ["GLUTEN"] },
  {
    id: 434,
    name: "Pastelería (galletas, bizcocho, magdalenas...)",
    allergens: ["GLUTEN", "HUEVOS", "LACTEOS"],
  },
  { id: 435, name: "Patés y conservas (con gluten)", allergens: ["GLUTEN"] },
  {
    id: 436,
    name: "Quesos fundidos (según etiquetado)",
    allergens: ["GLUTEN", "LACTEOS"],
  },
  { id: 437, name: "Sémola", allergens: ["GLUTEN"] },
  { id: 438, name: "Sopas de sobre", allergens: ["GLUTEN", "APIO", "SOJA"] },
  { id: 439, name: "Trigo", allergens: ["GLUTEN"] },
  { id: 440, name: "Trazas de cereales con gluten", allergens: ["GLUTEN"] },

  // ─── CRUSTÁCEOS ───
  { id: 501, name: "Bogavante", allergens: ["CRUSTACEOS"] },
  { id: 502, name: "Buey de mar", allergens: ["CRUSTACEOS"] },
  { id: 503, name: "Camarones", allergens: ["CRUSTACEOS"] },
  { id: 504, name: "Cangrejo", allergens: ["CRUSTACEOS"] },
  { id: 505, name: "Carabinero", allergens: ["CRUSTACEOS"] },
  { id: 506, name: "Centollo", allergens: ["CRUSTACEOS"] },
  { id: 507, name: "Cigala", allergens: ["CRUSTACEOS"] },
  { id: 508, name: "Derivados de crustáceos", allergens: ["CRUSTACEOS"] },
  { id: 509, name: "Gamba", allergens: ["CRUSTACEOS"] },
  { id: 510, name: "Gambón", allergens: ["CRUSTACEOS"] },
  { id: 511, name: "Langosta", allergens: ["CRUSTACEOS"] },
  { id: 512, name: "Langostino", allergens: ["CRUSTACEOS"] },
  { id: 513, name: "Nécora", allergens: ["CRUSTACEOS"] },
  { id: 514, name: "Percebes", allergens: ["CRUSTACEOS"] },
  {
    id: 515,
    name: "Preparados para paellas",
    allergens: ["CRUSTACEOS", "PESCADO", "MOLUSCOS"],
  },
  {
    id: 516,
    name: "Productos a base de crustáceos",
    allergens: ["CRUSTACEOS"],
  },
  { id: 517, name: "Trazas de crustáceos", allergens: ["CRUSTACEOS"] },

  // ─── SULFITOS ───
  { id: 601, name: "Dióxido de azufre, sulfitos", allergens: ["SULFITOS"] },
  {
    id: 602,
    name: "Alimentos deshidratados (con sulfitos)",
    allergens: ["SULFITOS"],
  },
  {
    id: 603,
    name: "Alimentos preparados (con sulfitos)",
    allergens: ["SULFITOS"],
  },
  { id: 604, name: "Bebidas con sulfitos", allergens: ["SULFITOS"] },
  { id: 605, name: "Conservantes (E220-E228)", allergens: ["SULFITOS"] },
  {
    id: 606,
    name: "Ensalada (con sulfitos / aliños)",
    allergens: ["SULFITOS"],
  },
  { id: 607, name: "Metabisulfito", allergens: ["SULFITOS"] },
  { id: 608, name: "Vinagre", allergens: ["SULFITOS"] },
  { id: 609, name: "Vino blanco", allergens: ["SULFITOS"] },

  // ─── FRUTOS DE CÁSCARA ───
  { id: 701, name: "Alfóncigos", allergens: ["FRUTOS_DE_CASCARA"] },
  { id: 702, name: "Almendras", allergens: ["FRUTOS_DE_CASCARA"] },
  { id: 703, name: "Anacardos", allergens: ["FRUTOS_DE_CASCARA"] },
  { id: 704, name: "Avellanas", allergens: ["FRUTOS_DE_CASCARA"] },
  {
    id: 705,
    name: "Bombón con frutos secos (según etiquetado)",
    allergens: ["FRUTOS_DE_CASCARA", "LACTEOS", "SOJA"],
  },
  { id: 706, name: "Castañas", allergens: ["FRUTOS_DE_CASCARA"] },
  {
    id: 707,
    name: "Cereales (con frutos secos)",
    allergens: ["GLUTEN", "FRUTOS_DE_CASCARA"],
  },
  {
    id: 708,
    name: "Cóctel de frutos secos",
    allergens: ["FRUTOS_DE_CASCARA", "CACAHUETES"],
  },
  {
    id: 709,
    name: "Cremas con frutos secos (según etiquetado)",
    allergens: ["FRUTOS_DE_CASCARA", "LACTEOS"],
  },
  {
    id: 710,
    name: "Frutos secos artificiales",
    allergens: ["FRUTOS_DE_CASCARA"],
  },
  {
    id: 711,
    name: "Helados con frutos secos (según etiquetado)",
    allergens: ["FRUTOS_DE_CASCARA", "LACTEOS"],
  },
  {
    id: 712,
    name: "Mantequilla de frutos secos",
    allergens: ["FRUTOS_DE_CASCARA"],
  },
  { id: 713, name: "Mazapán", allergens: ["FRUTOS_DE_CASCARA", "HUEVOS"] },
  { id: 714, name: "Nueces", allergens: ["FRUTOS_DE_CASCARA"] },
  { id: 715, name: "Nuez de Brasil", allergens: ["FRUTOS_DE_CASCARA"] },
  { id: 716, name: "Nuez de macadamia", allergens: ["FRUTOS_DE_CASCARA"] },
  { id: 717, name: "Nuez dura americana", allergens: ["FRUTOS_DE_CASCARA"] },
  { id: 718, name: "Nuez pacana", allergens: ["FRUTOS_DE_CASCARA"] },
  { id: 719, name: "Pacanas", allergens: ["FRUTOS_DE_CASCARA"] },
  {
    id: 720,
    name: "Pan de semilla",
    allergens: ["GLUTEN", "SESAMO", "FRUTOS_DE_CASCARA"],
  },
  { id: 721, name: "Pasta de almendra", allergens: ["FRUTOS_DE_CASCARA"] },
  { id: 722, name: "Piñón", allergens: ["FRUTOS_DE_CASCARA"] },
  { id: 723, name: "Pipas", allergens: ["FRUTOS_DE_CASCARA"] },
  { id: 724, name: "Pipas de girasol", allergens: ["FRUTOS_DE_CASCARA"] },
  { id: 725, name: "Pistachos", allergens: ["FRUTOS_DE_CASCARA"] },
  {
    id: 726,
    name: "Productos emulsionados (según etiquetado)",
    allergens: ["FRUTOS_DE_CASCARA", "HUEVOS", "SOJA"],
  },
  {
    id: 727,
    name: "Proteína vegetal hidrolizada",
    allergens: ["SOJA", "FRUTOS_DE_CASCARA"],
  },
  {
    id: 728,
    name: "Salsa barbacoa",
    allergens: ["MOSTAZA", "SULFITOS", "FRUTOS_DE_CASCARA"],
  },
  {
    id: 729,
    name: "Salsa inglesa",
    allergens: ["PESCADO", "GLUTEN", "SOJA", "FRUTOS_DE_CASCARA"],
  },
  { id: 730, name: "Salsa pesto", allergens: ["LACTEOS", "FRUTOS_DE_CASCARA"] },
  {
    id: 731,
    name: "Trazas de frutos de cáscara",
    allergens: ["FRUTOS_DE_CASCARA"],
  },
  {
    id: 732,
    name: "Turrón con frutos secos (según etiquetado)",
    allergens: ["FRUTOS_DE_CASCARA", "HUEVOS"],
  },

  // ─── HUEVOS ───
  { id: 801, name: "Albúmina", allergens: ["HUEVOS"] },
  { id: 802, name: "Aroma de huevo", allergens: ["HUEVOS"] },
  { id: 803, name: "Caramelos (con huevo)", allergens: ["HUEVOS"] },
  { id: 804, name: "Clara de huevo pasteurizado", allergens: ["HUEVOS"] },
  { id: 805, name: "Consomés (con huevo)", allergens: ["HUEVOS"] },
  { id: 806, name: "Derivados de huevo", allergens: ["HUEVOS"] },
  {
    id: 807,
    name: "Embutidos con huevo (según etiquetado)",
    allergens: ["HUEVOS"],
  },
  {
    id: 808,
    name: "Fiambres con huevo (según etiquetado)",
    allergens: ["HUEVOS"],
  },
  { id: 809, name: "Flanes (con huevo)", allergens: ["HUEVOS", "LACTEOS"] },
  { id: 810, name: "Gelatinas (con huevo)", allergens: ["HUEVOS"] },
  { id: 811, name: "Helados (con huevo)", allergens: ["HUEVOS", "LACTEOS"] },
  { id: 812, name: "Huevo", allergens: ["HUEVOS"] },
  { id: 813, name: "Huevo al natural", allergens: ["HUEVOS"] },
  { id: 814, name: "Huevo en polvo", allergens: ["HUEVOS"] },
  { id: 815, name: "Huevo pasteurizado", allergens: ["HUEVOS"] },
  { id: 816, name: "Lecitina (E322)", allergens: ["HUEVOS", "SOJA"] },
  { id: 817, name: "Mahonesa", allergens: ["HUEVOS"] },
  { id: 818, name: "Mahonesa y derivados", allergens: ["HUEVOS"] },
  { id: 819, name: "Merengues (con huevo)", allergens: ["HUEVOS"] },
  {
    id: 820,
    name: "Pan rallado (con huevo según etiquetado)",
    allergens: ["GLUTEN", "HUEVOS"],
  },
  { id: 821, name: "Pastas al huevo", allergens: ["GLUTEN", "HUEVOS"] },
  {
    id: 822,
    name: "Pasteles y bollos elaborados con huevo",
    allergens: ["GLUTEN", "LACTEOS", "HUEVOS"],
  },
  {
    id: 823,
    name: "Patés con huevo (según etiquetado)",
    allergens: ["HUEVOS"],
  },
  { id: 824, name: "Purés (con huevo)", allergens: ["HUEVOS"] },
  { id: 825, name: "Rebozados (con huevo)", allergens: ["GLUTEN", "HUEVOS"] },
  {
    id: 826,
    name: "Salchichas con huevo (según etiquetado)",
    allergens: ["HUEVOS"],
  },
  { id: 827, name: "Sopas (con huevo)", allergens: ["HUEVOS", "GLUTEN"] },
  { id: 828, name: "Sucedáneo de huevo", allergens: ["HUEVOS"] },
  { id: 829, name: "Trazas de huevo", allergens: ["HUEVOS"] },
  {
    id: 830,
    name: "Vinos clarificados con clara de huevo",
    allergens: ["HUEVOS", "SULFITOS"],
  },

  // ─── LECHE Y SUS DERIVADOS ───
  { id: 901, name: "Acidulantes (con lactosa)", allergens: ["LACTEOS"] },
  { id: 902, name: "Batidos (con leche)", allergens: ["LACTEOS"] },
  {
    id: 903,
    name: "Bollería (con leche)",
    allergens: ["GLUTEN", "LACTEOS", "HUEVOS"],
  },
  { id: 904, name: "Caseína", allergens: ["LACTEOS"] },
  {
    id: 905,
    name: "Cereales (con leche según etiquetado)",
    allergens: ["GLUTEN", "LACTEOS"],
  },
  { id: 906, name: "Chocolate blanco", allergens: ["LACTEOS"] },
  { id: 907, name: "Chocolate con leche", allergens: ["LACTEOS"] },
  { id: 908, name: "Chocolate negro", allergens: ["LACTEOS", "SOJA"] },
  {
    id: 909,
    name: "Colorante caramelo (según etiquetado)",
    allergens: ["LACTEOS", "SULFITOS"],
  },
  { id: 910, name: "Conservantes (con lactosa)", allergens: ["LACTEOS"] },
  {
    id: 911,
    name: "Conservas (con leche según etiquetado)",
    allergens: ["LACTEOS"],
  },
  { id: 912, name: "Crema de leche", allergens: ["LACTEOS"] },
  { id: 913, name: "Cuajada", allergens: ["LACTEOS"] },
  {
    id: 914,
    name: "Cubitos de caldo (con lactosa)",
    allergens: ["LACTEOS", "SOJA", "GLUTEN"],
  },
  { id: 915, name: "Derivados de la leche", allergens: ["LACTEOS"] },
  { id: 916, name: "Emulgentes (con lactosa)", allergens: ["LACTEOS"] },
  { id: 917, name: "Espesantes (con lactosa)", allergens: ["LACTEOS"] },
  { id: 918, name: "Fermentos lácticos", allergens: ["LACTEOS"] },
  { id: 919, name: "Helados", allergens: ["LACTEOS"] },
  { id: 920, name: "Horchatas (con leche)", allergens: ["LACTEOS"] },
  { id: 921, name: "Lactosa", allergens: ["LACTEOS"] },
  { id: 922, name: "Leche", allergens: ["LACTEOS"] },
  { id: 923, name: "Leche condensada", allergens: ["LACTEOS"] },
  { id: 924, name: "Leche descremada", allergens: ["LACTEOS"] },
  { id: 925, name: "Leche en polvo", allergens: ["LACTEOS"] },
  { id: 926, name: "Leche espumada", allergens: ["LACTEOS"] },
  { id: 927, name: "Leche evaporada", allergens: ["LACTEOS"] },
  { id: 928, name: "Mantequilla", allergens: ["LACTEOS"] },
  { id: 929, name: "Nata", allergens: ["LACTEOS"] },
  { id: 930, name: "Natillas", allergens: ["LACTEOS", "HUEVOS"] },
  { id: 931, name: "Pan (con leche)", allergens: ["GLUTEN", "LACTEOS"] },
  { id: 932, name: "Papillas", allergens: ["LACTEOS", "GLUTEN"] },
  {
    id: 933,
    name: "Potitos, papillas y cereales con lactosa",
    allergens: ["LACTEOS", "GLUTEN"],
  },
  { id: 934, name: "Proteínas de la leche", allergens: ["LACTEOS"] },
  { id: 935, name: "Queso", allergens: ["LACTEOS"] },
  { id: 936, name: "Salsas elaboradas (con lactosa)", allergens: ["LACTEOS"] },
  {
    id: 937,
    name: "Sopas de sobre (con lactosa)",
    allergens: ["LACTEOS", "GLUTEN"],
  },
  { id: 938, name: "Sorbetes", allergens: ["LACTEOS"] },
  { id: 939, name: "Suero lácteo", allergens: ["LACTEOS"] },
  { id: 940, name: "Trazas de leche", allergens: ["LACTEOS"] },
  {
    id: 941,
    name: "Trazas de leche (contenida en chorizo)",
    allergens: ["LACTEOS"],
  },
  {
    id: 942,
    name: "Trazas de leche (contenida en morcilla)",
    allergens: ["LACTEOS"],
  },
  {
    id: 943,
    name: "Trazas de leche (contenida en panceta)",
    allergens: ["LACTEOS"],
  },
  {
    id: 944,
    name: "Trazas de leche (contenida en sobrasada)",
    allergens: ["LACTEOS"],
  },
  { id: 945, name: "Yogurt", allergens: ["LACTEOS"] },
  { id: 946, name: "Zumos (con leche)", allergens: ["LACTEOS"] },

  // ─── MOLUSCOS ───
  { id: 1001, name: "Almeja", allergens: ["MOLUSCOS"] },
  { id: 1002, name: "Berberecho", allergens: ["MOLUSCOS"] },
  { id: 1003, name: "Bígaro", allergens: ["MOLUSCOS"] },
  { id: 1004, name: "Busano", allergens: ["MOLUSCOS"] },
  { id: 1005, name: "Calamar", allergens: ["MOLUSCOS"] },
  { id: 1006, name: "Caldo a base de moluscos", allergens: ["MOLUSCOS"] },
  { id: 1007, name: "Cañailla", allergens: ["MOLUSCOS"] },
  { id: 1008, name: "Caracol de tierra", allergens: ["MOLUSCOS"] },
  { id: 1009, name: "Chipirón", allergens: ["MOLUSCOS"] },
  { id: 1010, name: "Chirla", allergens: ["MOLUSCOS"] },
  { id: 1011, name: "Choco", allergens: ["MOLUSCOS"] },
  { id: 1012, name: "Coquina", allergens: ["MOLUSCOS"] },
  { id: 1013, name: "Derivados de moluscos", allergens: ["MOLUSCOS"] },
  { id: 1014, name: "Lapa", allergens: ["MOLUSCOS"] },
  { id: 1015, name: "Mejillón", allergens: ["MOLUSCOS"] },

  // ─── MOLUSCOS (Continuación) ───
  { id: 1016, name: "Navaja", allergens: ["MOLUSCOS"] }, // [cite: 23]
  { id: 1017, name: "Ostra", allergens: ["MOLUSCOS"] }, // [cite: 23]
  { id: 1018, name: "Pota", allergens: ["MOLUSCOS"] }, // [cite: 23]
  {
    id: 1019,
    name: "Preparados para paellas",
    allergens: ["MOLUSCOS", "PESCADO", "CRUSTACEOS"],
  }, // [cite: 23]
  { id: 1020, name: "Productos a base de moluscos", allergens: ["MOLUSCOS"] }, // [cite: 23]
  { id: 1021, name: "Pulpo", allergens: ["MOLUSCOS"] }, // [cite: 23]
  { id: 1022, name: "Puntillitas", allergens: ["MOLUSCOS"] }, // [cite: 23]
  { id: 1023, name: "Sepia", allergens: ["MOLUSCOS"] }, // [cite: 23]
  { id: 1024, name: "Trazas de moluscos", allergens: ["MOLUSCOS"] }, // [cite: 23]
  { id: 1025, name: "Vieira", allergens: ["MOLUSCOS"] }, // [cite: 23]

  // ─── MOSTAZA ───
  { id: 1101, name: "Aroma de mostaza", allergens: ["MOSTAZA"] }, // [cite: 24]
  { id: 1102, name: "Curry", allergens: ["MOSTAZA"] }, // [cite: 24]
  { id: 1103, name: "Derivados de mostaza", allergens: ["MOSTAZA"] }, // [cite: 24]
  { id: 1104, name: "Especias (con mostaza)", allergens: ["MOSTAZA"] }, // [cite: 24]
  { id: 1105, name: "Ketchup (con mostaza)", allergens: ["MOSTAZA"] }, // [cite: 24]
  {
    id: 1106,
    name: "Mahonesa (con mostaza)",
    allergens: ["HUEVOS", "MOSTAZA"],
  }, // [cite: 24]
  { id: 1107, name: "Productos a base de mostaza", allergens: ["MOSTAZA"] }, // [cite: 24]
  { id: 1108, name: "Salsa de mostaza", allergens: ["MOSTAZA"] }, // [cite: 24]
  { id: 1109, name: "Trazas de mostaza", allergens: ["MOSTAZA"] }, // [cite: 24]
  {
    id: 1110,
    name: "Vinagreta (con mostaza)",
    allergens: ["MOSTAZA", "SULFITOS"],
  }, // [cite: 24]

  // ─── PESCADO ───
  { id: 1201, name: "Abadejo", allergens: ["PESCADO"] }, // [cite: 25]
  { id: 1202, name: "Acedias", allergens: ["PESCADO"] }, // [cite: 25]
  { id: 1203, name: "Agujetas", allergens: ["PESCADO"] }, // [cite: 25]
  { id: 1204, name: "Anchoa", allergens: ["PESCADO"] }, // [cite: 25]
  { id: 1205, name: "Atún", allergens: ["PESCADO"] }, // [cite: 25]
  { id: 1206, name: "Bacaladilla", allergens: ["PESCADO"] }, // [cite: 25]
  { id: 1207, name: "Bacalao", allergens: ["PESCADO"] }, // [cite: 25]
  { id: 1208, name: "Besugo", allergens: ["PESCADO"] }, // [cite: 25]
  { id: 1209, name: "Bonito", allergens: ["PESCADO"] }, // [cite: 25]
  { id: 1210, name: "Boquerón", allergens: ["PESCADO"] }, // [cite: 25]
  { id: 1211, name: "Caballa", allergens: ["PESCADO"] }, // [cite: 25]
  { id: 1212, name: "Cabracho", allergens: ["PESCADO"] }, // [cite: 25]
  {
    id: 1213,
    name: "Caldos preparados a base de pescado (según etiquet)",
    allergens: ["PESCADO"],
  }, // [cite: 25]
  { id: 1214, name: "Cazón", allergens: ["PESCADO"] }, // [cite: 25]
  { id: 1215, name: "Congrio", allergens: ["PESCADO"] }, // [cite: 25]
  { id: 1216, name: "Corvina", allergens: ["PESCADO"] }, // [cite: 26]
  { id: 1217, name: "Derivados de pescado", allergens: ["PESCADO"] }, // [cite: 26]
  { id: 1218, name: "Dorada", allergens: ["PESCADO"] }, // [cite: 26]
  { id: 1219, name: "Emperador", allergens: ["PESCADO"] }, // [cite: 26]
  { id: 1220, name: "Fletán", allergens: ["PESCADO"] }, // [cite: 26]
  { id: 1221, name: "Fogonero", allergens: ["PESCADO"] }, // [cite: 26]
  { id: 1222, name: "Gallo", allergens: ["PESCADO"] }, // [cite: 26]
  { id: 1223, name: "Gelatinas (según etiquetado)", allergens: ["PESCADO"] }, // [cite: 26]
  { id: 1224, name: "Harinas de pescado", allergens: ["PESCADO"] }, // [cite: 26]
  { id: 1225, name: "Jurel", allergens: ["PESCADO"] }, // [cite: 26]
  { id: 1226, name: "Lenguado", allergens: ["PESCADO"] }, // [cite: 26]
  { id: 1227, name: "Liba", allergens: ["PESCADO"] }, // [cite: 26]
  { id: 1228, name: "Lubina", allergens: ["PESCADO"] }, // [cite: 26]
  { id: 1229, name: "Marrajo", allergens: ["PESCADO"] }, // [cite: 26]
  { id: 1230, name: "Melva", allergens: ["PESCADO"] }, // [cite: 27]
  { id: 1231, name: "Merluza", allergens: ["PESCADO"] }, // [cite: 27]
  { id: 1232, name: "Mero", allergens: ["PESCADO"] }, // [cite: 27]
  { id: 1233, name: "Palometa", allergens: ["PESCADO"] }, // [cite: 27]
  { id: 1234, name: "Pescadilla", allergens: ["PESCADO"] }, // [cite: 27]
  { id: 1235, name: "Pescado", allergens: ["PESCADO"] }, // [cite: 27]
  { id: 1236, name: "Pez espada", allergens: ["PESCADO"] }, // [cite: 27]
  { id: 1237, name: "Pez platino", allergens: ["PESCADO"] }, // [cite: 27, 28]
  {
    id: 1238,
    name: "Pollos alimentados con harina de pescado (según et",
    allergens: ["PESCADO"],
  }, // [cite: 27, 28]
  {
    id: 1239,
    name: "Preparados para paellas",
    allergens: ["PESCADO", "CRUSTACEOS", "MOLUSCOS"],
  }, // [cite: 27, 28]
  { id: 1240, name: "Productos a base de pescado", allergens: ["PESCADO"] }, // [cite: 27, 28]
  {
    id: 1241,
    name: "Productos enriquecidos con omega 3",
    allergens: ["PESCADO"],
  }, // [cite: 27, 28]
  { id: 1242, name: "Proteína de pescado", allergens: ["PESCADO"] }, // [cite: 27, 28]
  { id: 1243, name: "Rape", allergens: ["PESCADO"] }, // [cite: 27, 28]
  { id: 1244, name: "Raya", allergens: ["PESCADO"] }, // [cite: 27, 28]
  { id: 1245, name: "Salmón", allergens: ["PESCADO"] }, // [cite: 28]
  { id: 1246, name: "Salmonete", allergens: ["PESCADO"] }, // [cite: 28]
  { id: 1247, name: "Sardina", allergens: ["PESCADO"] }, // [cite: 28]
  {
    id: 1248,
    name: "Surimi",
    allergens: ["PESCADO", "HUEVOS", "SOJA", "CRUSTACEOS"],
  }, // [cite: 28]
  { id: 1249, name: "Tiburón", allergens: ["PESCADO"] }, // [cite: 28]
  { id: 1250, name: "Trazas de pescado", allergens: ["PESCADO"] }, // [cite: 28]
  { id: 1251, name: "Trucha", allergens: ["PESCADO"] }, // [cite: 28]

  // ─── SÉSAMO ───
  { id: 1301, name: "Aceite de sésamo", allergens: ["SESAMO"] }, //
  {
    id: 1302,
    name: "Bollería con sésamo (según etiquetado)",
    allergens: ["SESAMO", "GLUTEN", "LACTEOS", "HUEVOS"],
  }, //
  { id: 1303, name: "Derivados de sésamo", allergens: ["SESAMO"] }, //
  { id: 1304, name: "Falafel", allergens: ["SESAMO"] }, //
  { id: 1305, name: "Hummus", allergens: ["SESAMO"] }, //
  {
    id: 1306,
    name: "Panadería con sésamo (según etiquetado)",
    allergens: ["SESAMO", "GLUTEN"],
  }, //
  { id: 1307, name: "Pasta de sésamo (tahini)", allergens: ["SESAMO"] }, //
  { id: 1308, name: "Productos a base de sésamo", allergens: ["SESAMO"] }, //
  {
    id: 1309,
    name: "Puré de berenjenas con tahini (según etiquetado)",
    allergens: ["SESAMO"],
  }, //
  { id: 1310, name: "Sésamo al natural", allergens: ["SESAMO"] }, //
  { id: 1311, name: "Trazas de sésamo", allergens: ["SESAMO"] }, //

  // ─── SOJA ───
  { id: 1401, name: "Aceite de soja", allergens: ["SOJA"] }, //
  {
    id: 1402,
    name: "Aceite vegetal (con soja según etiquetado)",
    allergens: ["SOJA"],
  }, //
  { id: 1403, name: "Aroma", allergens: ["SOJA"] }, //
  { id: 1404, name: "Aroma de soja", allergens: ["SOJA", "GLUTEN"] }, //
  { id: 1405, name: "Harina de soja", allergens: ["SOJA"] }, //
  { id: 1406, name: "Lecitina de soja (E322)", allergens: ["SOJA"] }, //
  { id: 1407, name: "Productos a base de soja", allergens: ["SOJA"] }, //
  { id: 1408, name: "Proteina de soja", allergens: ["SOJA"] }, //
  { id: 1409, name: "Salsa de soja", allergens: ["SOJA", "GLUTEN"] }, //
  {
    id: 1410,
    name: "Salsa tamari (con soja según etiquetado)",
    allergens: ["SOJA"],
  }, //
  { id: 1411, name: "Soja", allergens: ["SOJA"] }, //
  { id: 1412, name: "Sucedáneo de carne (con soja)", allergens: ["SOJA"] }, //
  { id: 1413, name: "Tofu", allergens: ["SOJA"] }, //
  { id: 1414, name: "Trazas de soja", allergens: ["SOJA"] }, //
  {
    id: 1415,
    name: "Trazas de soja (contenida en chorizo)",
    allergens: ["SOJA"],
  }, //
  {
    id: 1416,
    name: "Trazas de soja (contenida en morcilla)",
    allergens: ["SOJA"],
  }, //
  {
    id: 1417,
    name: "Trazas de soja (contenida en panceta)",
    allergens: ["SOJA"],
  }, //
  {
    id: 1418,
    name: "Trazas de soja (contenida en sobrasada)",
    allergens: ["SOJA"],
  }, //
];
