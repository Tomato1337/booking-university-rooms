import type { Dictionary } from "./ru";

export const en: Dictionary = {
  auth: {
    loginTab: "Login",
    registerTab: "Register",
    login: {
      title: "Access Terminal",
      subtitle: "Authenticate to the campus resource grid.",
      email: "Email",
      emailPlaceholder: "S1234567@UNIVERSITY.EDU",
      password: "Password",
      passwordPlaceholder: "••••••••",
      submit: "Access Terminal",
      submitting: "Authenticating...",
    },
    register: {
      title: "Initialize Profile",
      subtitle: "Access the campus resource grid.",
      firstName: "First Name",
      firstNamePlaceholder: "ALEXANDER",
      lastName: "Last Name",
      lastNamePlaceholder: "VANCE",
      email: "Email",
      emailPlaceholder: "S1234567@UNIVERSITY.EDU",
      department: "Department",
      departmentPlaceholder: "SELECT DEPARTMENT",
      password: "Create Password",
      passwordPlaceholder: "••••••••",
      confirmPassword: "Confirm Password",
      confirmPasswordPlaceholder: "••••••••",
      submit: "Create Account",
      submitting: "Creating...",
    },
    branding: {
      subtitle:
        "The next-generation space management protocol for the modern academic ecosystem. Precision booking, real-time telemetry.",
    },
  },
  sidebar: {
    dashboard: "Dashboard",
    roomSearch: "Room Search",
    myBookings: "My Bookings",
  },
  admin: {
    dashboard: {
      title: "Dashboard",
      tabs: {
        bookings: "bookings",
        rooms: "rooms",
        equipment: "equipment",
        statistics: "statistics"
      }
    },
    bookings: {
      metrics: {
        pendingRequests: "Pending Requests",
        todayBookings: "Today Bookings",
        occupancyRate: "Occupancy Rate",
        activeRooms: "Active Rooms"
      },
      title: "Bookings",
      tabs: {
        active: "Active",
        history: "History"
      },
      searchPlaceholder: "SEARCH BY USER, ROOM, BUILDING, OR TITLE...",
      columns: {
        user: "User",
        details: "Booking Details",
        datetime: "Date & Time",
        status: "Status",
        actions: "Actions"
      },
      loading: "Loading bookings...",
      noPendingRequests: "No pending requests match your search",
      noHistory: "No history matches your search",
      noDepartment: "No department",
      approveReject: {
        rejectTitle: "Reject Booking",
        approveTitle: "Approve Booking",
        rejectDesc: "Reject {label}? You can provide an optional reason.",
        approveDesc: "Approve {label}? Conflicting pending requests may be auto-rejected.",
        reasonLabel: "Rejection reason (optional)",
        reasonPlaceholder: "Reason for rejecting this request...",
        rejectConfirm: "Reject Booking",
        rejecting: "Rejecting...",
        approveConfirm: "Approve Booking"
      }
    },
    rooms: {
      title: "Rooms",
      createRoom: "Create Room",
      tabs: {
        active: "Active Rooms",
        inactive: "Inactive Rooms"
      },
      searchPlaceholder: "SEARCH BY ROOM OR BUILDING...",
      columns: {
        room: "Room",
        type: "Type",
        capacity: "Capacity",
        location: "Location",
        equipment: "Equipment",
        status: "Status",
        actions: "Actions"
      },
      noEquipment: "No equipment",
      statuses: {
        active: "Active",
        inactive: "Inactive"
      },
      actions: {
        restore: "Restore",
        delete: "Delete",
        edit: "Edit",
        deactivate: "Deactivate"
      },
      loading: "Loading rooms...",
      noRooms: "No rooms found",
      loadMore: "Load More",
      loadingMore: "Loading...",
      alerts: {
        deactivateTitle: "Deactivate Room?",
        deactivateDesc: "Are you sure you want to deactivate this room? It will be moved to the inactive list. Existing bookings will not be cancelled.",
        deactivateCancel: "Cancel",
        deactivateConfirm: "Deactivate",
        deactivating: "Deactivating...",
        deleteTitle: "Permanently Delete Room?",
        deleteDesc: "This action cannot be undone. This will permanently remove the room from the database. Rooms with existing bookings cannot be deleted.",
        deleteCancel: "Cancel",
        deleteConfirm: "Delete Permanently",
        deleting: "Deleting..."
      },
      toasts: {
        deactivated: "Room successfully deactivated.",
        hardDeleted: "Room permanently deleted.",
        hardDeleteFailed: "Failed to delete room. It might have bookings.",
        reactivated: "Room successfully reactivated."
      },
      form: {
        editTitle: "Edit Room",
        createTitle: "Create Room",
        description: "Configure room details, operating hours, equipment, and media.",
        name: "Name",
        namePlaceholder: "e.g. LAB_402B",
        building: "Building",
        buildingPlaceholder: "e.g. Building A",
        roomType: "Room Type",
        capacity: "Capacity",
        floor: "Floor",
        openTime: "Open Time",
        closeTime: "Close Time",
        equipment: "Equipment",
        descriptionLabel: "Description",
        descriptionPlaceholder: "Optional room notes",
        photos: "Photos",
        cancel: "Cancel",
        save: "Save Changes",
        create: "Create Room",
        saving: "Saving...",
        types: {
          lab: "Lab",
          auditorium: "Auditorium",
          seminar: "Seminar",
          conference: "Conference",
          studio: "Studio",
          lecture_hall: "Lecture Hall"
        }
      }
    },
    equipment: {
      title: "Equipment",
      create: "Create Equipment",
      tabs: {
        catalog: "Catalog",
        usage: "Usage"
      },
      form: {
        editTitle: "Edit Equipment",
        createTitle: "Create Equipment",
        description: "Define a reusable equipment entry and choose its Tabler icon.",
        name: "Name",
        namePlaceholder: "e.g. Projector",
        icon: "Icon",
        preview: "Preview",
        defaultName: "Equipment",
        cancel: "Cancel",
        saving: "Saving...",
        saveChanges: "Save Changes",
        create: "Create Equipment"
      },
      columns: {
        icon: "Icon",
        name: "Name",
        actions: "Actions"
      },
      loading: "Loading equipment...",
      noEquipment: "No equipment items",
      icons: {
        video: "Video",
        presentation: "Presentation",
        broadcast: "Broadcast",
        desktop: "Desktop",
        microphone: "Microphone",
        wifi: "Wi-Fi",
        volume: "Audio",
        terminal: "Terminal",
        chalkboard: "Chalkboard"
      },
      actions: {
        edit: "Edit",
        delete: "Delete"
      },
      alerts: {
        deleteSummary: "Equipment delete summary",
        removed: "{name} has been removed from catalogue.",
        cascadeDone: "Cascade behavior applied: equipment relationships were removed from linked rooms.",
        deleteConfirmText: "Delete {name}? This action updates room-equipment relationships.",
        cascadeWarning: "Cascade behavior: linked rooms will no longer include this equipment.",
        wasUsed: "Was used in rooms",
        inUse: "In use by rooms",
        close: "Close",
        done: "Done",
        confirmDelete: "Confirm Delete",
        deleting: "Deleting..."
      }
    },
    statistics: {
      title: "Statistics",
      subtitle: "Operational metrics for booking moderation and room utilization",
      selectPeriod: "Select period",
      periods: {
        today: "Today",
        week: "Week",
        month: "Month",
        all: "All"
      },
      loading: "Loading statistics...",
      charts: {
        statusTitle: "Bookings by Status",
        statusDesc: "Distribution of booking states",
        popularTitle: "Popular Rooms",
        popularDesc: "Top rooms by booking count",
        dayOfWeekTitle: "Bookings by Day of Week",
        dayOfWeekDesc: "Weekly demand distribution",
        occupancyTitle: "Occupancy by Building",
        occupancyDesc: "Building load (horizontal bars)"
      },
      tooltips: {
        bookings: "Bookings",
        occupancy: "Occupancy",
        room: "Room"
      }
    }
  },
  bookings: {
    title: "My Bookings",
    tabs: {
      active: "Active",
      history: "History"
    },
    searchPlaceholder: "SEARCH BY NAME...",
    columns: {
      details: "Booking Details",
      datetime: "Date & Time",
      location: "Location",
      status: "Status",
      action: "Action"
    },
    loading: "Loading bookings...",
    noActive: "No active bookings match your search",
    noHistory: "No booking history matches your search",
    alerts: {
      cancelTitle: "Cancel Booking",
      cancelDesc: "Are you sure you want to cancel this booking?",
      cancelDescNamed: "Are you sure you want to cancel {bookingId} for {roomName}?",
      keepBooking: "Keep Booking",
      confirmCancel: "Yes, cancel",
      cancelling: "Cancelling..."
    },
    status: {
      pending: "Pending",
      confirmed: "Confirmed",
      rejected: "Rejected",
      cancelled: "Cancelled"
    },
    actions: {
      cancel: "Cancel"
    }
  },
  rooms: {
    title: "Room Search",
    findAvailable: "Find Available Rooms",
    resultsTitle: "Availability Results",
    matchesFound: "{count} Matches Found",
    searchPlaceholder: "SEARCH ROOM BY NAME...",
    noMatches: "No rooms match your filters",
    filters: {
      date: "Date",
      pickDate: "Pick a date",
      from: "From",
      to: "To",
      minCapacity: "Min Capacity",
      anyCapacity: "Any",
      equipment: "Equipment",
    },
    availability: {
      "AVAILABLE": "AVAILABLE",
      "AVAILABLE NOW": "AVAILABLE NOW",
      "FULLY BOOKED": "FULLY BOOKED",
      "BOOKED UNTIL": "BOOKED UNTIL {time}",
    },
    card: {
      capacity: "Cap. {capacity}",
      floor: "Floor {floor}",
      occupied: "OCCUPIED"
    }
  },
  roomDetail: {
    loadingTitle: "LOADING...",
    capacity: "Capacity",
    persons: "Persons",
    type: "Type",
    condition: "Condition",
    pristine: "Pristine",
    equipment: "Equipment Inventory",
    occupancy: "Daily Occupancy",
    yourBookings: "Your Bookings Today",
    actions: {
      cancel: "Cancel"
    },
    alerts: {
      cancelTitle: "Cancel Booking",
      cancelDesc: "Cancel this booking?",
      cancelDescNamed: 'Cancel "{title}" from your bookings today?',
      keepBooking: "Keep Booking",
      confirmCancel: "Yes, cancel",
      cancelling: "Cancelling..."
    }
  },
  timeGrid: {
    available: "Available",
    booked: "Booked",
    pending: "Pending",
    yours: "Your Session",
    yours_pending: "Your Pending",
  },
  booking: {
    form: {
      title: "Request Access",
      subtitle: "Fill in the session parameters below.",
      sessionTitle: "Session Title",
      sessionTitlePlaceholder: "e.g. Advanced AI Seminar",
      purpose: "Purpose",
      startTime: "Start Time",
      endTime: "End Time",
      attendeeCount: "Attendee Count",
      attendeePlaceholder: "e.g. 35",
      submit: "Confirm Booking",
      noteLabel: "NOTE:",
      noteDescription: "Booking is subject to faculty approval. A response will be issued within 24 hours of submission.",
      errors: {
        titleRequired: "Title is required",
        timeFormat: "Time must be HH:mm in 5-minute steps",
        endBeforeStart: "End time must be after start time",
      }
    },
    alerts: {
      overlapPending: "WARNING: overlaps pending. Request may be rejected later.",
      overlapYours: "ERROR: overlaps your booking. Choose another time.",
      overlapOccupied: "ERROR: overlaps occupied slot. Choose another time.",
      attendeeExceedsCapacity: "Attendee count exceeds room capacity ({roomCapacity})",
    },
    purposes: {
      academic_lecture: "Academic Lecture",
      research_workshop: "Research Workshop",
      collaborative_study: "Collaborative Study",
      technical_assessment: "Technical Assessment",
    }
  },
  validation: {
    required: "Required field",
    maxLength: "Value too long",
    invalidTime: "Time must be HH:mm in 5-minute steps",
    timeOrder: "closeTime must be after openTime",
    invalidEmail: "Invalid email address",
    passwordRequired: "Password is required",
    passwordMinLength: "Password must be at least 8 characters",
    passwordUppercase: "Must contain at least 1 uppercase letter",
    passwordLowercase: "Must contain at least 1 lowercase letter",
    passwordDigit: "Must contain at least 1 digit",
    confirmPasswordRequired: "Please confirm your password",
    firstNameRequired: "First name is required",
    lastNameRequired: "Last name is required",
  },
  common: {
    loading: "Loading...",
    error: "Error",
    cancel: "Cancel",
  },
};
