// ============================================================================
//  Taxonomía de gastos — heredada de Gastolens y EXTENDIDA con las categorías
//  propias del anfitrión de Airbnb (limpieza, comisiones, mantenimiento...).
//
//  `color` es rampa MONOCROMA (ver DESIGN.md §1): el sistema editorial admite
//  un único acento rojo, así que las categorías se codifican por valor de gris,
//  no por matiz. El rojo queda para el dato clave, nunca para una categoría.
//  `icon` referencia un componente de lucide-react (ver categoryIcons.js).
// ============================================================================
export const CATEGORIES = {
  Limpieza: {
    color: '#0A0A0A',
    icon: 'Sparkles',
    deductible: true,
    subcategories: {
      'Servicio limpieza': ['limpieza', 'limpiar', 'limpiadora', 'cleaning', 'señora de la limpieza', 'empresa limpieza'],
      Lavandería: ['lavandería', 'lavanderia', 'sábanas', 'sabanas', 'toallas', 'colada', 'tintorería', 'tintoreria'],
      'Productos limpieza': ['detergente', 'lejía', 'lejia', 'fregona', 'productos limpieza', 'amoniaco', 'desinfectante'],
    },
  },
  Comisiones: {
    color: '#3D3D3D',
    icon: 'CreditCard',
    deductible: true,
    subcategories: {
      'Comisión canal': ['comisión airbnb', 'comision airbnb', 'comisión booking', 'comision booking', 'fee', 'comisión plataforma', 'service fee'],
      Gestión: ['gestoría', 'gestoria', 'gestión', 'comisión gestor', 'property manager', 'administración'],
    },
  },
  Suministros: {
    color: '#5C5C5C',
    icon: 'Lightbulb',
    deductible: true,
    subcategories: {
      Electricidad: ['luz', 'electricidad', 'eléctrica', 'iberdrola', 'endesa', 'naturgy', 'holaluz', 'octopus'],
      Agua: ['agua', 'canal de isabel', 'aguas municipales'],
      Gas: ['gas', 'calefacción', 'calefaccion'],
      Internet: ['internet', 'fibra', 'wifi', 'movistar', 'vodafone', 'orange', 'jazztel', 'router', 'masmovil', 'digi'],
    },
  },
  Mantenimiento: {
    color: '#7A7A7A',
    icon: 'Wrench',
    deductible: true,
    subcategories: {
      Fontanería: ['fontanero', 'fontanería', 'fontaneria', 'grifo', 'tubería', 'tuberia', 'desatasco', 'caldera'],
      Electricidad: ['electricista', 'enchufe', 'cuadro eléctrico', 'avería eléctrica'],
      Reparaciones: ['reparación', 'reparacion', 'arreglo', 'avería', 'averia', 'manitas', 'pintura', 'pintor', 'cerrajero', 'persiana'],
      Electrodomésticos: ['nevera', 'lavadora', 'lavavajillas', 'horno', 'microondas', 'aire acondicionado', 'caldera', 'termo'],
    },
  },
  Amenities: {
    color: '#9B9B9B',
    icon: 'ShoppingBag',
    deductible: true,
    subcategories: {
      Acogida: ['amenities', 'bienvenida', 'welcome', 'gel', 'champú', 'champu', 'jabón', 'jabon', 'papel higiénico', 'papel higienico', 'café cápsulas', 'agua botellas'],
      Menaje: ['menaje', 'vajilla', 'sábanas', 'sabanas', 'toallas', 'almohada', 'edredón', 'edredon', 'cubertería', 'cuberteria', 'ikea', 'leroy'],
      Decoración: ['decoración', 'decoracion', 'cuadro', 'planta', 'cojín', 'cojin', 'lámpara', 'lampara', 'alfombra'],
    },
  },
  Impuestos: {
    color: '#BDBDBD',
    icon: 'Landmark',
    deductible: true,
    subcategories: {
      IBI: ['ibi', 'impuesto bienes', 'contribución', 'contribucion'],
      Comunidad: ['comunidad', 'gastos comunidad', 'comunidad propietarios', 'derrama'],
      'Tasa turística': ['tasa turística', 'tasa turistica', 'tasa', 'licencia turística', 'licencia turistica'],
      Seguro: ['seguro', 'póliza', 'poliza', 'seguro hogar', 'seguro alquiler', 'mapfre', 'axa'],
    },
  },
  Otros: {
    color: '#DCDCDC',
    icon: 'Package',
    deductible: false,
    subcategories: {
      General: [],
    },
  },
};

export const CATEGORY_LIST = Object.keys(CATEGORIES);

export const ALL_SUBCATEGORIES = Object.entries(CATEGORIES).flatMap(([cat, data]) =>
  Object.keys(data.subcategories).map(sub => ({ category: cat, subcategory: sub }))
);

export function isCategoryDeductible(category) {
  return CATEGORIES[category]?.deductible ?? false;
}
