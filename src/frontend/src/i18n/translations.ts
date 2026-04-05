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
  // Customers section
  customers: {
    eyebrow: string;
    title: string;
    subtitle: string;
  };
  // Services section
  services: {
    title: string;
    systemDesign: {
      title: string;
      description: string;
    };
    systemAnalysis: {
      title: string;
      description: string;
    };
    systemImpl: {
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
    users: string;
    calendar: string;
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
    blockUser: string;
    blocking: string;
    userBlocked: string;
    userBlockError: string;
    confirmBlock: string;
    confirmBlockMsg: string;
    principal: string;
    role: string;
    name: string;
    email: string;
    phone: string;
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
    editUserProfile: string;
    profileUpdated: string;
    profileUpdateError: string;
  };
  // Calendar / Holidays
  calendar: {
    title: string;
    highHolidays: string;
    subtitle: string;
    easter: string;
    christmas: string;
    newyear: string;
    midsommar: string;
    saved: string;
    saveError: string;
    noHoliday: string;
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
      body: "Solete Vida Group S.L. has been working with IT development since 1998. With over two decades of experience, we bridge local market knowledge with international business acumen — providing our clients with unparalleled access to opportunities in Spain and beyond. We are committed to delivering excellence, integrity, and sustainable growth in every venture we undertake.",
      cta: "More About Us",
    },
    customers: {
      eyebrow: "Our Journey",
      title: "Clients We Have Served",
      subtitle:
        "Over the decades, we have had the privilege of working with leading organizations across Sweden and Europe.",
    },
    services: {
      title: "Our Services",
      systemDesign: {
        title: "System Design",
        description:
          "We architect robust, scalable IT solutions tailored to your business needs, leveraging modern technologies including ICP blockchain for future-ready development.",
      },
      systemAnalysis: {
        title: "System Analysis",
        description:
          "In-depth analysis of your existing systems and processes to identify opportunities for improvement, efficiency, and digital transformation.",
      },
      systemImpl: {
        title: "System Implementation & Test",
        description:
          "End-to-end implementation and rigorous testing of IT systems, ensuring quality, reliability, and seamless delivery — with ICP blockchain as a target for future development.",
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
      address:
        "Polígono 2 Parcela 206, Urbanización Buganvilla, 03750 Pedreguer (La Sella), Spain",
      email: "info@soletvida.com",
      phone: "+34 91 123 4567",
      copyright: "© {year} Solete Vida Group S.L. All rights reserved.",
    },
    myPages: {
      title: "My Pages",
      profile: "Profile",
      adminPanel: "Admin Panel",
      users: "Users",
      calendar: "Calendar",
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
      blockUser: "Block",
      blocking: "Blocking...",
      userBlocked: "User blocked",
      userBlockError: "Failed to block user",
      confirmBlock: "Block User",
      confirmBlockMsg:
        "This will restrict the user to guest-level access. You can unblock them by changing their role.",
      principal: "Principal ID",
      role: "Role",
      name: "Name",
      email: "Email",
      phone: "Phone",
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
      editUserProfile: "Edit User Profile",
      profileUpdated: "Profile updated successfully!",
      profileUpdateError: "Failed to update profile.",
    },
    calendar: {
      title: "Calendar",
      highHolidays: "High Holidays",
      subtitle: "Activate a holiday to show a splash screen on page load.",
      easter: "Easter",
      christmas: "Christmas Eve",
      newyear: "New Year's Eve",
      midsommar: "Midsummer",
      saved: "Holiday saved!",
      saveError: "Failed to save holiday.",
      noHoliday: "No holiday active",
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
      body: "Solete Vida Group S.L. ha trabajado en el desarrollo de TI desde 1998. Con más de dos décadas de experiencia, conectamos el conocimiento del mercado local con la perspicacia empresarial internacional, proporcionando a nuestros clientes un acceso incomparable a oportunidades en España y más allá.",
      cta: "Más Sobre Nosotros",
    },
    customers: {
      eyebrow: "Nuestro Camino",
      title: "Clientes que Hemos Atendido",
      subtitle:
        "A lo largo de las décadas, hemos tenido el privilegio de trabajar con organizaciones líderes en Suecia y Europa.",
    },
    services: {
      title: "Nuestros Servicios",
      systemDesign: {
        title: "Diseño de Sistemas",
        description:
          "Diseñamos soluciones de TI robustas y escalables adaptadas a sus necesidades empresariales, aprovechando tecnologías modernas incluida la blockchain ICP para un desarrollo preparado para el futuro.",
      },
      systemAnalysis: {
        title: "Análisis de Sistemas",
        description:
          "Análisis exhaustivo de sus sistemas y procesos existentes para identificar oportunidades de mejora, eficiencia y transformación digital.",
      },
      systemImpl: {
        title: "Implementación y Prueba de Sistemas",
        description:
          "Implementación integral y pruebas rigurosas de sistemas de TI, garantizando calidad, fiabilidad y entrega fluida — con la blockchain ICP como objetivo para el desarrollo futuro.",
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
      address:
        "Polígono 2 Parcela 206, Urbanización Buganvilla, 03750 Pedreguer (La Sella), España",
      email: "info@soletvida.com",
      phone: "+34 91 123 4567",
      copyright:
        "© {year} Solete Vida Group S.L. Todos los derechos reservados.",
    },
    myPages: {
      title: "Mis Páginas",
      profile: "Perfil",
      adminPanel: "Panel de Administración",
      users: "Usuarios",
      calendar: "Calendario",
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
      blockUser: "Bloquear",
      blocking: "Bloqueando...",
      userBlocked: "Usuario bloqueado",
      userBlockError: "Error al bloquear usuario",
      confirmBlock: "Bloquear Usuario",
      confirmBlockMsg:
        "Esto restringirá al usuario a acceso de nivel invitado. Puedes desbloquearlo cambiando su rol.",
      principal: "ID Principal",
      role: "Rol",
      name: "Nombre",
      email: "Correo",
      phone: "Teléfono",
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
      editUserProfile: "Editar Perfil de Usuario",
      profileUpdated: "¡Perfil actualizado con éxito!",
      profileUpdateError: "Error al actualizar el perfil.",
    },
    calendar: {
      title: "Calendario",
      highHolidays: "Festividades",
      subtitle:
        "Activa una festividad para mostrar una pantalla de presentación al cargar la página.",
      easter: "Pascua",
      christmas: "Nochebuena",
      newyear: "Nochevieja",
      midsommar: "Midsommar",
      saved: "¡Festividad guardada!",
      saveError: "Error al guardar la festividad.",
      noHoliday: "Ninguna festividad activa",
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
      body: "Solete Vida Group S.L. har arbetat med IT-utveckling sedan 1998. Med över två decenniers erfarenhet överbryggar vi lokal marknadskännedom med internationell affärsskarphet — och ger våra kunder oöverträffad tillgång till möjligheter i Spanien och bortom.",
      cta: "Mer Om Oss",
    },
    customers: {
      eyebrow: "Vår Resa",
      title: "Kunder Vi Har Betjänat",
      subtitle:
        "Under decennierna har vi haft förmånen att arbeta med ledande organisationer i Sverige och Europa.",
    },
    services: {
      title: "Våra Tjänster",
      systemDesign: {
        title: "Systemdesign",
        description:
          "Vi utformar robusta och skalbara IT-lösningar anpassade efter dina affärsbehov, med moderna teknologier inklusive ICP blockchain för framtidssäker utveckling.",
      },
      systemAnalysis: {
        title: "Systemanalys",
        description:
          "Djupgående analys av dina befintliga system och processer för att identifiera möjligheter till förbättring, effektivisering och digital transformation.",
      },
      systemImpl: {
        title: "Systemimplementering & Test",
        description:
          "Heltäckande implementering och rigorös testning av IT-system, med fokus på kvalitet, tillförlitlighet och sömlös leverans — med ICP blockchain som mål för framtida utveckling.",
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
      address:
        "Polígono 2 Parcela 206, Urbanización Buganvilla, 03750 Pedreguer (La Sella), Spanien",
      email: "info@soletvida.com",
      phone: "+34 91 123 4567",
      copyright:
        "© {year} Solete Vida Group S.L. Alla rättigheter förbehållna.",
    },
    myPages: {
      title: "Mina Sidor",
      profile: "Profil",
      adminPanel: "Administratörspanel",
      users: "Användare",
      calendar: "Kalender",
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
      blockUser: "Blockera",
      blocking: "Blockerar...",
      userBlocked: "Användare blockerad",
      userBlockError: "Misslyckades att blockera användare",
      confirmBlock: "Blockera Användare",
      confirmBlockMsg:
        "Detta begränsar användaren till gästnivåtillgång. Du kan avblockera dem genom att ändra deras roll.",
      principal: "Huvud-ID",
      role: "Roll",
      name: "Namn",
      email: "E-post",
      phone: "Telefon",
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
      editUserProfile: "Redigera Användarprofil",
      profileUpdated: "Profilen uppdaterades!",
      profileUpdateError: "Kunde inte uppdatera profilen.",
    },
    calendar: {
      title: "Kalender",
      highHolidays: "Höga Tider",
      subtitle:
        "Aktivera en högtid för att visa en splash screen vid sidstart.",
      easter: "Påsk",
      christmas: "Julafton",
      newyear: "Nyårsafton",
      midsommar: "Midsommar",
      saved: "Högtid sparad!",
      saveError: "Kunde inte spara högtid.",
      noHoliday: "Ingen högtid aktiv",
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
