export default {
  hello: {
    world: 'Hola {param}!',
    nested: {
      translations: 'Traducciones',
    },
  },
  profile: {
    settings: 'Configuración',
    manage:
      'Administra la configuración de tu cuenta y establece preferencias de correo electrónico.',
    profile: 'Perfil',
    buddyDetails: 'Detalles del Buddy',
    profileUpdated: 'Perfil actualizado',
    name: 'Nombre',
    publicDisplay: 'Tu nombre público',
    yourEmail: 'Tu dirección de correo electrónico',
    bio: 'Cuéntanos un poco sobre ti',
    email: 'tu@email.com',
    PROJECTProfileImage: 'Imagen de perfil de PROJECT®',
    addLinks:
      'Agrega enlaces a tu sitio web, blog o perfiles de redes sociales.',
    addUrl: 'Agregar URL',
    dateOfBirth: 'Fecha de nacimiento',
    pickADate: 'Elige una fecha',
    yourInformation:
      'Tu información está encriptada y no se comparte con nadie.',
    updateProfile: 'Actualizar perfil',
    logout: 'Cerrar sesión',
    metaData: {
      title: 'PROJECT® - La plataforma de desarrollo de software',
      description:
        'Descubre PROJECT®, la plataforma definitiva para el desarrollo y la colaboración de software. ¡Únete a PROJECT® hoy y da vida a tus proyectos!',
      openGraph: {
        locale: 'es',
      },
      imageAlt: 'PROJECT® - La plataforma de desarrollo de software',
    },
    account: {
      title: 'Cuenta',
      update:
        'Actualiza la configuración de tu cuenta. Establece tu idioma preferido.',
      languageUpdated: 'Idioma actualizado con éxito',
      language: 'Idioma',
      selectLanguage: 'Selecciona idioma',
      searchLanguage: 'Buscar idioma',
      errorUpdatingLanguage: 'Error al actualizar el idioma',
      noLanguageFound: 'No se encontró el idioma',
      updateProfile: 'Actualizar perfil',
      appearance: 'Apariencia',
      customize: 'Personaliza tu experiencia. Establece tu tema preferido.',
    },
    appearance: {
      title: 'Apariencia',
      appearanceUpdated: 'Preferencias de apariencia actualizadas',
      font: 'Fuente',
      setFont: 'Establece la fuente que deseas usar en el tablero.',
      theme: 'Tema',
      selectTheme:
        'Selecciona tu tema preferido. Actualmente solo está disponible el tema oscuro.',
      light: 'Claro',
      dark: 'Oscuro',
      updateAppearance: 'Actualizar apariencia',
      customize: 'Personaliza tu experiencia. Establece tu tema preferido.',
    },
    display: {
      title: 'Mostrar',
      turnItemsOnOrOff: 'Controla tu aplicación y activa o desactiva elementos',
      sidebar: 'Barra lateral',
      selectItems:
        'Selecciona los elementos que deseas mostrar en la barra lateral.',
      updateDisplay: 'Actualizar visualización',
      customize: 'Personaliza tu experiencia. Establece tu tema preferido.',
    },
  },
  common: {
    loading: 'Cargando...',
    login: 'Iniciar sesión',
    cancel: 'Cancelar',
    errorTitle: 'Error',
    search: 'Buscar',
    clear: 'Limpiar',
    filters: 'Filtros',
    ascending: 'Ascendente',
    descending: 'Descendente',
    reset: 'Restablecer',
    sortByRating: 'Ordenar por calificación',
    header: 'Inicio',
    failed: 'Error',
    noElementsFound: 'No se encontraron elementos',
    siteName: 'PROJECT',
    siteDescription: 'Descubre PROJECT®, la plataforma definitiva.',
  },
  siteHeader: {
    login: 'Iniciar sesión',
    about: 'Acerca de',
    admin: 'Administrador',
    profile: 'Perfil',
    comingSoon: 'Próximamente',
  },
  localeSwitcher: {
    languageUpdated: 'Idioma actualizado con éxito',
    en: 'Inglés',
    es: 'Español',
    label: 'Idioma',
  },
  footer: {
    companyDescription: 'Una empresa de PROJECT.',
    contactUs: 'Contáctanos',
    email: 'Correo electrónico:',
    whatsapp: 'WhatsApp:',
    followUs: 'Síguenos',
    allRightsReserved: '© {year} PROJECT. Todos los derechos reservados.',
  },
  cookies: {
    title: '🍪 Valoramos tu privacidad',
    description:
      'Utilizamos cookies para mejorar tu experiencia de navegación, ofrecer contenido personalizado y analizar nuestro tráfico. Al hacer clic en "Aceptar todo", das tu consentimiento al uso de nuestras cookies.',
    acceptAll: 'Aceptar todo',
    rejectAll: 'Rechazar todo',
    customize: 'Personalizar preferencias',
    preferencesTitle: 'Preferencias de cookies',
    preferencesDescription:
      'Gestiona tus preferencias de cookies aquí. Algunas cookies son necesarias para que el sitio web funcione y no se pueden desactivar.',
    essential: {
      title: 'Cookies esenciales',
      description:
        'Necesarias para que el sitio web funcione correctamente. No se pueden desactivar.',
    },
    analytics: {
      title: 'Cookies de análisis',
      description:
        'Nos ayudan a entender cómo los visitantes interactúan con nuestro sitio web.',
    },
    marketing: {
      title: 'Cookies de marketing',
      description:
        'Se utilizan para rastrear a los visitantes en los sitios web con fines de marketing.',
    },
    back: 'Atrás',
    savePreferences: 'Guardar preferencias',
  },
  badges: {
    pending: 'Pendiente',
    approved: 'Aprobado',
    rejected: 'Rechazado',
    active: 'Activo',
    inactive: 'Inactivo',
    featured: 'Destacado',
    not_featured: 'No Destacado',
    verified: 'Verificado',
    unverified: 'No Verificado',
  },
} as const;
