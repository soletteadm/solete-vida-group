export type Language = "en" | "es" | "sv";

export interface TranslationMap {
  // Navigation
  nav: {
    home: string;
    about: string;
    services: string;
    contact: string;
    myPages: string;
    clientLogin: string;
    logout: string;
  };
  // Hero section
  hero: {
    title: string;
    subtitle: string;
    exploreCta: string;
    learnMore: string;
  };
  // About section
  about: {
    eyebrow: string;
    title: string;
    body: string;
    cta: string;
  };
  // Services section
  services: {
    title: string;
    advisory: {
      title: string;
      description: string;
    };
    investment: {
      title: string;
      description: string;
    };
    management: {
      title: string;
      description: string;
    };
  };
  // Why Choose section
  whyChoose: {
    title: string;
    expertTeam: {
      title: string;
      description: string;
    };
    trustedNetwork: {
      title: string;
      description: string;
    };
    localKnowledge: {
      title: string;
      description: string;
    };
    globalReach: {
      title: string;
      description: string;
    };
  };
  // Testimonials
  testimonials: {
    title: string;
    items: Array<{
      quote: string;
      author: string;
      position: string;
    }>;
  };
  // Footer
  footer: {
    description: string;
    menu: string;
    contactTitle: string;
    address: string;
    email: string;
    phone: string;
    copyright: string;
  };
  // My Pages
  myPages: {
    title: string;
    profile: string;
    adminPanel: string;
    principalId: string;
    name: string;
    email: string;
    phone: string;
    save: string;
    saving: string;
    readonly: string;
    editProfile: string;
    profileSaved: string;
    profileError: string;
    registeredAt: string;
    noProfile: string;
    createProfile: string;
  };
  // Admin panel
  admin: {
    title: string;
    addUser: string;
    addUserBtn: string;
    adding: string;
    updateRole: string;
    removeUser: string;
    removing: string;
    principal: string;
    role: string;
    name: string;
    email: string;
    actions: string;
    noUsers: string;
    userAdded: string;
    userAddError: string;
    roleUpdated: string;
    roleUpdateError: string;
    userRemoved: string;
    userRemoveError: string;
    confirmRemove: string;
    confirmRemoveMsg: string;
    cancel: string;
    confirm: string;
    selectRole: string;
    enterPrincipal: string;
  };
  // Common
  common: {
    loading: string;
    error: string;
    retry: string;
    close: string;
    admin: string;
    user: string;
    guest: string;
  };
}

export const translations: Record<Language, TranslationMap> = {
  en: {
    nav: {
      home: "Home",
      about: "About",
      services: "Services",
      contact: "Contact",
      myPages: "My Pages",
      clientLogin: "Client Login",
      logout: "Logout",
    },
    hero: {
      title: "SOLETE VIDA GROUP S.L.",
      subtitle: "Excellence in Mediterranean Business & Ventures.",
      exploreCta: "Explore Our Services",
      learnMore: "Learn More",
    },
    about: {
      eyebrow: "About Us",
      title: "Who We Are",
      body: "Solete Vida Group S.L. is a premier business consultancy and investment group based in the heart of the Mediterranean. With decades of combined expertise, we bridge local market knowledge with international business acumen — providing our clients with unparalleled access to opportunities in Spain and beyond. We are committed to delivering excellence, integrity, and sustainable growth in every venture we undertake.",
      cta: "More About Us",
    },
    services: {
      title: "Our Services",
      advisory: {
        title: "Business Advisory",
        description:
          "Strategic guidance and expert counsel for businesses seeking to establish or expand their presence in the Mediterranean market.",
      },
      investment: {
        title: "Investment Solutions",
        description:
          "Curated investment opportunities in real estate, ventures, and private equity across Spain and the wider Mediterranean region.",
      },
      management: {
        title: "Portfolio Management",
        description:
          "Comprehensive management solutions to protect, grow, and optimize your business and investment portfolios.",
      },
    },
    whyChoose: {
      title: "Why Choose Solete Vida?",
      expertTeam: {
        title: "Expert Team",
        description:
          "Seasoned professionals with decades of experience across finance, law, real estate, and business development.",
      },
      trustedNetwork: {
        title: "Trusted Network",
        description:
          "Deep relationships with key decision-makers, institutions, and partners across the Iberian Peninsula and Europe.",
      },
      localKnowledge: {
        title: "Local Knowledge",
        description:
          "Unmatched understanding of Spanish market dynamics, regulations, and cultural nuances that drive success.",
      },
      globalReach: {
        title: "Global Reach",
        description:
          "International connections and cross-border expertise to facilitate opportunities that span multiple markets.",
      },
    },
    testimonials: {
      title: "What Our Clients Say",
      items: [
        {
          quote:
            "Solete Vida Group guided us through every step of our Spanish market entry. Their expertise and network are unmatched.",
          author: "Henrik Lindström",
          position: "CEO, Nordic Ventures AB",
        },
        {
          quote:
            "The team's deep local knowledge and professional dedication transformed our investment strategy in the region.",
          author: "María Elena Castellanos",
          position: "Managing Director, Castellanos Capital",
        },
      ],
    },
    footer: {
      description:
        "Solete Vida Group S.L. — Your trusted partner for Mediterranean business excellence and investment opportunities.",
      menu: "Navigation",
      contactTitle: "Contact Us",
      address: "Calle de la Prosperidad 42, 28002 Madrid, Spain",
      email: "info@soletvida.com",
      phone: "+34 91 123 4567",
      copyright: "© {year} Solete Vida Group S.L. All rights reserved.",
    },
    myPages: {
      title: "My Pages",
      profile: "Profile",
      adminPanel: "Admin Panel",
      principalId: "Principal ID",
      name: "Full Name",
      email: "Email Address",
      phone: "Phone Number",
      save: "Save Changes",
      saving: "Saving...",
      readonly: "Your profile is set to read-only.",
      editProfile: "Edit Profile",
      profileSaved: "Profile saved successfully!",
      profileError: "Failed to save profile.",
      registeredAt: "Member Since",
      noProfile: "No profile found.",
      createProfile: "Create Profile",
    },
    admin: {
      title: "User Management",
      addUser: "Add New User",
      addUserBtn: "Add User",
      adding: "Adding...",
      updateRole: "Update Role",
      removeUser: "Remove",
      removing: "Removing...",
      principal: "Principal ID",
      role: "Role",
      name: "Name",
      email: "Email",
      actions: "Actions",
      noUsers: "No users registered yet.",
      userAdded: "User added successfully!",
      userAddError: "Failed to add user.",
      roleUpdated: "Role updated successfully!",
      roleUpdateError: "Failed to update role.",
      userRemoved: "User removed successfully!",
      userRemoveError: "Failed to remove user.",
      confirmRemove: "Confirm Removal",
      confirmRemoveMsg:
        "Are you sure you want to remove this user? This action cannot be undone.",
      cancel: "Cancel",
      confirm: "Remove User",
      selectRole: "Select role",
      enterPrincipal: "Enter principal ID",
    },
    common: {
      loading: "Loading...",
      error: "An error occurred.",
      retry: "Retry",
      close: "Close",
      admin: "Admin",
      user: "User",
      guest: "Guest",
    },
  },

  es: {
    nav: {
      home: "Inicio",
      about: "Nosotros",
      services: "Servicios",
      contact: "Contacto",
      myPages: "Mis Páginas",
      clientLogin: "Acceso Clientes",
      logout: "Cerrar Sesión",
    },
    hero: {
      title: "SOLETE VIDA GROUP S.L.",
      subtitle: "Excelencia en Negocios e Inversiones del Mediterráneo.",
      exploreCta: "Ver Nuestros Servicios",
      learnMore: "Saber Más",
    },
    about: {
      eyebrow: "Sobre Nosotros",
      title: "Quiénes Somos",
      body: "Solete Vida Group S.L. es un grupo líder de consultoría empresarial e inversión ubicado en el corazón del Mediterráneo. Con décadas de experiencia combinada, conectamos el conocimiento del mercado local con la perspicacia empresarial internacional, proporcionando a nuestros clientes un acceso incomparable a oportunidades en España y más allá.",
      cta: "Más Sobre Nosotros",
    },
    services: {
      title: "Nuestros Servicios",
      advisory: {
        title: "Asesoría Empresarial",
        description:
          "Orientación estratégica y asesoramiento experto para empresas que buscan establecer o ampliar su presencia en el mercado mediterráneo.",
      },
      investment: {
        title: "Soluciones de Inversión",
        description:
          "Oportunidades de inversión seleccionadas en bienes raíces, empresas y capital privado en España y la región mediterránea.",
      },
      management: {
        title: "Gestión de Carteras",
        description:
          "Soluciones integrales de gestión para proteger, hacer crecer y optimizar sus carteras empresariales y de inversión.",
      },
    },
    whyChoose: {
      title: "¿Por Qué Elegirnos?",
      expertTeam: {
        title: "Equipo Experto",
        description:
          "Profesionales experimentados con décadas de experiencia en finanzas, derecho, inmobiliario y desarrollo empresarial.",
      },
      trustedNetwork: {
        title: "Red de Confianza",
        description:
          "Relaciones sólidas con tomadores de decisiones, instituciones y socios clave en la Península Ibérica y Europa.",
      },
      localKnowledge: {
        title: "Conocimiento Local",
        description:
          "Comprensión inigualable de la dinámica del mercado español, regulaciones y matices culturales que impulsan el éxito.",
      },
      globalReach: {
        title: "Alcance Global",
        description:
          "Conexiones internacionales y experiencia transfronteriza para facilitar oportunidades que abarcan múltiples mercados.",
      },
    },
    testimonials: {
      title: "Lo Que Dicen Nuestros Clientes",
      items: [
        {
          quote:
            "Solete Vida Group nos guió en cada paso de nuestra entrada al mercado español. Su experiencia y red son incomparables.",
          author: "Henrik Lindström",
          position: "CEO, Nordic Ventures AB",
        },
        {
          quote:
            "El profundo conocimiento local del equipo y su dedicación profesional transformaron nuestra estrategia de inversión en la región.",
          author: "María Elena Castellanos",
          position: "Directora General, Castellanos Capital",
        },
      ],
    },
    footer: {
      description:
        "Solete Vida Group S.L. — Su socio de confianza para la excelencia empresarial mediterránea y oportunidades de inversión.",
      menu: "Navegación",
      contactTitle: "Contáctenos",
      address: "Calle de la Prosperidad 42, 28002 Madrid, España",
      email: "info@soletvida.com",
      phone: "+34 91 123 4567",
      copyright:
        "© {year} Solete Vida Group S.L. Todos los derechos reservados.",
    },
    myPages: {
      title: "Mis Páginas",
      profile: "Perfil",
      adminPanel: "Panel de Administración",
      principalId: "ID Principal",
      name: "Nombre Completo",
      email: "Correo Electrónico",
      phone: "Número de Teléfono",
      save: "Guardar Cambios",
      saving: "Guardando...",
      readonly: "Su perfil está configurado como solo lectura.",
      editProfile: "Editar Perfil",
      profileSaved: "¡Perfil guardado con éxito!",
      profileError: "Error al guardar el perfil.",
      registeredAt: "Miembro Desde",
      noProfile: "Perfil no encontrado.",
      createProfile: "Crear Perfil",
    },
    admin: {
      title: "Gestión de Usuarios",
      addUser: "Añadir Nuevo Usuario",
      addUserBtn: "Añadir Usuario",
      adding: "Añadiendo...",
      updateRole: "Actualizar Rol",
      removeUser: "Eliminar",
      removing: "Eliminando...",
      principal: "ID Principal",
      role: "Rol",
      name: "Nombre",
      email: "Correo",
      actions: "Acciones",
      noUsers: "No hay usuarios registrados.",
      userAdded: "¡Usuario añadido con éxito!",
      userAddError: "Error al añadir usuario.",
      roleUpdated: "¡Rol actualizado con éxito!",
      roleUpdateError: "Error al actualizar el rol.",
      userRemoved: "¡Usuario eliminado con éxito!",
      userRemoveError: "Error al eliminar el usuario.",
      confirmRemove: "Confirmar Eliminación",
      confirmRemoveMsg:
        "¿Está seguro de que desea eliminar este usuario? Esta acción no se puede deshacer.",
      cancel: "Cancelar",
      confirm: "Eliminar Usuario",
      selectRole: "Seleccionar rol",
      enterPrincipal: "Ingrese el ID principal",
    },
    common: {
      loading: "Cargando...",
      error: "Ocurrió un error.",
      retry: "Reintentar",
      close: "Cerrar",
      admin: "Administrador",
      user: "Usuario",
      guest: "Invitado",
    },
  },

  sv: {
    nav: {
      home: "Hem",
      about: "Om Oss",
      services: "Tjänster",
      contact: "Kontakt",
      myPages: "Mina Sidor",
      clientLogin: "Kundlogin",
      logout: "Logga Ut",
    },
    hero: {
      title: "SOLETE VIDA GROUP S.L.",
      subtitle: "Excellens i Medelhavets Affärsliv & Ventures.",
      exploreCta: "Utforska Våra Tjänster",
      learnMore: "Läs Mer",
    },
    about: {
      eyebrow: "Om Oss",
      title: "Vilka Vi Är",
      body: "Solete Vida Group S.L. är en ledande affärskonsult- och investeringsgrupp belägen i hjärtat av Medelhavsregionen. Med decennier av kombinerad expertis överbryggar vi lokal marknadskännedom med internationell affärsskarphet — och ger våra kunder oöverträffad tillgång till möjligheter i Spanien och bortom.",
      cta: "Mer Om Oss",
    },
    services: {
      title: "Våra Tjänster",
      advisory: {
        title: "Affärsrådgivning",
        description:
          "Strategisk vägledning och expertis för företag som vill etablera eller expandera sin närvaro på den mediterrana marknaden.",
      },
      investment: {
        title: "Investeringslösningar",
        description:
          "Utvald investeringsmöjligheter inom fastigheter, ventures och private equity i Spanien och bredare Medelhavsregionen.",
      },
      management: {
        title: "Portföljförvaltning",
        description:
          "Heltäckande förvaltningslösningar för att skydda, växa och optimera dina affärs- och investeringsportföljer.",
      },
    },
    whyChoose: {
      title: "Varför Välja Solete Vida?",
      expertTeam: {
        title: "Expertteam",
        description:
          "Erfarna proffs med decennier av erfarenhet inom finans, juridik, fastigheter och affärsutveckling.",
      },
      trustedNetwork: {
        title: "Pålitligt Nätverk",
        description:
          "Djupa relationer med viktiga beslutsfattare, institutioner och partners på Iberiska halvön och i Europa.",
      },
      localKnowledge: {
        title: "Lokal Kunskap",
        description:
          "Oöverträffad förståelse för den spanska marknadens dynamik, regelverk och kulturella nyanser som driver framgång.",
      },
      globalReach: {
        title: "Global Räckvidd",
        description:
          "Internationella kontakter och gränsöverskridande expertis för att underlätta möjligheter på flera marknader.",
      },
    },
    testimonials: {
      title: "Vad Våra Kunder Säger",
      items: [
        {
          quote:
            "Solete Vida Group vägledde oss i varje steg av vår inträde på den spanska marknaden. Deras expertis och nätverk är oöverträffade.",
          author: "Henrik Lindström",
          position: "VD, Nordic Ventures AB",
        },
        {
          quote:
            "Teamets djupa lokala kunskap och professionella engagemang förändrade vår investeringsstrategi i regionen.",
          author: "María Elena Castellanos",
          position: "Verkställande Direktör, Castellanos Capital",
        },
      ],
    },
    footer: {
      description:
        "Solete Vida Group S.L. — Din betrodda partner för medelhavsk affärsexcellens och investeringsmöjligheter.",
      menu: "Navigation",
      contactTitle: "Kontakta Oss",
      address: "Calle de la Prosperidad 42, 28002 Madrid, Spanien",
      email: "info@soletvida.com",
      phone: "+34 91 123 4567",
      copyright:
        "© {year} Solete Vida Group S.L. Alla rättigheter förbehållna.",
    },
    myPages: {
      title: "Mina Sidor",
      profile: "Profil",
      adminPanel: "Administratörspanel",
      principalId: "Huvud-ID",
      name: "Fullständigt Namn",
      email: "E-postadress",
      phone: "Telefonnummer",
      save: "Spara Ändringar",
      saving: "Sparar...",
      readonly: "Din profil är inställd på skrivskyddad.",
      editProfile: "Redigera Profil",
      profileSaved: "Profilen sparades!",
      profileError: "Kunde inte spara profilen.",
      registeredAt: "Medlem Sedan",
      noProfile: "Ingen profil hittades.",
      createProfile: "Skapa Profil",
    },
    admin: {
      title: "Användarhantering",
      addUser: "Lägg Till Ny Användare",
      addUserBtn: "Lägg Till Användare",
      adding: "Lägger till...",
      updateRole: "Uppdatera Roll",
      removeUser: "Ta Bort",
      removing: "Tar bort...",
      principal: "Huvud-ID",
      role: "Roll",
      name: "Namn",
      email: "E-post",
      actions: "Åtgärder",
      noUsers: "Inga användare registrerade ännu.",
      userAdded: "Användare tillagd!",
      userAddError: "Kunde inte lägga till användare.",
      roleUpdated: "Roll uppdaterad!",
      roleUpdateError: "Kunde inte uppdatera rollen.",
      userRemoved: "Användare borttagen!",
      userRemoveError: "Kunde inte ta bort användaren.",
      confirmRemove: "Bekräfta Borttagning",
      confirmRemoveMsg:
        "Är du säker på att du vill ta bort den här användaren? Åtgärden kan inte ångras.",
      cancel: "Avbryt",
      confirm: "Ta Bort Användare",
      selectRole: "Välj roll",
      enterPrincipal: "Ange huvud-ID",
    },
    common: {
      loading: "Laddar...",
      error: "Ett fel uppstod.",
      retry: "Försök igen",
      close: "Stäng",
      admin: "Administratör",
      user: "Användare",
      guest: "Gäst",
    },
  },
};
