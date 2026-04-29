/**
 * Single source of truth for allergen types and labels.
 * AllergenId mirrors the Spring Boot AllergenType enum (uppercase Spanish).
 */

export type AllergenId =
  | 'GLUTEN'
  | 'CRUSTACEOS'
  | 'HUEVOS'
  | 'PESCADO'
  | 'CACAHUETES'
  | 'SOJA'
  | 'LACTEOS'
  | 'FRUTOS_DE_CASCARA'
  | 'APIO'
  | 'MOSTAZA'
  | 'SESAMO'
  | 'SULFITOS'
  | 'ALTRAMUCES'
  | 'MOLUSCOS';

/** Human-readable Spanish label for each allergen — used in UI and PDF. */
export const ALLERGEN_LABEL: Record<AllergenId, string> = {
  GLUTEN:            'Gluten',
  CRUSTACEOS:        'Crustáceos',
  HUEVOS:            'Huevos',
  PESCADO:           'Pescado',
  CACAHUETES:        'Cacahuetes',
  SOJA:              'Soja',
  LACTEOS:           'Lácteos',
  FRUTOS_DE_CASCARA: 'Frutos de cáscara',
  APIO:              'Apio',
  MOSTAZA:           'Mostaza',
  SESAMO:            'Sésamo',
  SULFITOS:          'Sulfitos',
  ALTRAMUCES:        'Altramuces',
  MOLUSCOS:          'Moluscos',
};
