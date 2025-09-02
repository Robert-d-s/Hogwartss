"use strict";

// Application State Management
const AppState = {
  students: [],
  filteredStudents: [],
  currentFilter: "All",
  currentSort: { by: "lastName", direction: "asc" },

  // State methods
  setStudents(students) {
    this.students = students;
    this.updateFilteredStudents();
  },

  setFilter(filter) {
    this.currentFilter = filter;
    this.updateFilteredStudents();
  },

  setSort(sortBy, direction) {
    this.currentSort = { by: sortBy, direction };
    this.updateFilteredStudents();
  },

  updateFilteredStudents() {
    this.filteredStudents = this.filterStudents(this.students);
    this.filteredStudents = this.sortStudents(this.filteredStudents);
    UI.updateStudentDisplay(this.filteredStudents);
    UI.updateCounts();
  },

  filterStudents(students) {
    if (this.currentFilter === "expelled") {
      return students.filter((student) => student.expelled);
    } else if (this.currentFilter === "inquisitorialsquad") {
      return students.filter((student) => student.squad && !student.expelled);
    } else if (this.currentFilter === "prefects") {
      return students.filter((student) => student.prefect && !student.expelled);
    } else if (this.currentFilter !== "All") {
      return students.filter((student) => {
        if (!student.expelled) {
          return (
            student.house.toLowerCase() === this.currentFilter ||
            student.bloodType.toLowerCase() === this.currentFilter
          );
        }
        return false;
      });
    } else {
      return students.filter((student) => !student.expelled);
    }
  },

  sortStudents(students) {
    const direction = this.currentSort.direction === "desc" ? -1 : 1;
    return [...students].sort((a, b) => {
      if (a[this.currentSort.by] < b[this.currentSort.by])
        return -1 * direction;
      if (a[this.currentSort.by] > b[this.currentSort.by]) return 1 * direction;
      return 0;
    });
  },
};

window.addEventListener("DOMContentLoaded", start);

// UI Management Module
const UI = {
  elements: {
    get searchInput() {
      return document.querySelector("#search");
    },
    get studentList() {
      return document.querySelector("#list tbody");
    },
    get studentCount() {
      return document.querySelector("#studentCount");
    },
    get modal() {
      return document.querySelector(".modal");
    },
    get alertModal() {
      return document.querySelector("#alertModal");
    },
  },

  updateStudentDisplay(students) {
    if (!Array.isArray(students)) {
      console.error("displayList expects an array of students");
      return;
    }

    const listElement = this.elements.studentList;
    if (!listElement) {
      console.error("Student list element not found");
      return;
    }

    // Show loading state
    listElement.classList.add("loading");
    listElement.innerHTML = "";

    // Update student count
    if (this.elements.studentCount) {
      this.elements.studentCount.textContent = students.length;
    }

    // Use requestAnimationFrame for better performance
    requestAnimationFrame(() => {
      students.forEach((student) => this.createStudentCard(student));
      listElement.classList.remove("loading");
    });
  },

  createStudentCard(student) {
    const template = document.querySelector("template#student");
    if (!template) {
      console.error("Student template not found");
      return;
    }

    const clone = template.content.cloneNode(true);
    const firstNameEl = clone.querySelector("[data-field=firstName]");
    const lastNameEl = clone.querySelector("[data-field=lastName]");
    const imageEl = clone.querySelector("#image");

    if (firstNameEl) firstNameEl.textContent = student.firstName;
    if (lastNameEl) lastNameEl.textContent = student.lastName;

    if (imageEl) {
      imageEl.src = student.image;
      imageEl.alt = `${student.firstName} ${student.lastName} portrait`;

      // Add error handling for missing images
      imageEl.addEventListener("error", function () {
        this.src = "images/default_placeholder.png";
        console.warn(
          `Image not found for student: ${student.firstName} ${student.lastName}`
        );
      });

      // Add click handler with better accessibility
      imageEl.addEventListener("click", () =>
        Modal.showStudentDetails(student)
      );

      // Add keyboard support
      const row = clone.querySelector("tr");
      if (row) {
        row.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            Modal.showStudentDetails(student);
          }
        });
      }
    }

    this.elements.studentList.appendChild(clone);
  },

  updateCounts() {
    const counts = StudentManager.calculateCounts();
    Object.entries(counts).forEach(([filter, count]) => {
      const filterElement = document.querySelector(
        `button[data-filter="${filter}"] span`
      );
      if (filterElement) {
        filterElement.textContent = count;
      }
    });
  },

  showError(message) {
    const modal = this.elements.alertModal;
    const messageEl = document.querySelector("#alertMessage");

    if (modal && messageEl) {
      messageEl.textContent = message;
      modal.style.display = "block";
      modal.setAttribute("aria-hidden", "false");

      const closeButton = modal.querySelector(".close-button");
      if (closeButton) {
        closeButton.onclick = () => this.hideError();
      }

      // Close on outside click
      modal.onclick = (event) => {
        if (event.target === modal) {
          this.hideError();
        }
      };

      // Close on Escape key
      document.addEventListener("keydown", this.handleEscapeKey);
    }
  },

  hideError() {
    const modal = this.elements.alertModal;
    if (modal) {
      modal.style.display = "none";
      modal.setAttribute("aria-hidden", "true");
      document.removeEventListener("keydown", this.handleEscapeKey);
    }
  },

  handleEscapeKey(event) {
    if (event.key === "Escape") {
      UI.hideError();
      Modal.hide();
    }
  },
};

// Student Management Module
const StudentManager = {
  createStudent(jsonObject, bloodData) {
    const student = {
      firstName: "",
      middleName: null,
      lastName: null,
      nickName: null,
      house: "",
      gender: "",
      image: "",
      bloodType: "",
      squad: false,
      prefect: false,
      expelled: false,
    };

    const nameParts = jsonObject.fullname.trim().split(/\s+/);

    student.firstName = Utils.capitalizeName(nameParts[0]);
    student.house = Utils.capitalizeName(jsonObject.house.trim());
    student.gender = Utils.capitalizeName(jsonObject.gender.trim());

    // Parse name parts
    if (nameParts.length === 3) {
      if (nameParts[1].startsWith('"') && nameParts[1].endsWith('"')) {
        student.nickName = Utils.capitalizeName(nameParts[1].slice(1, -1));
      } else {
        student.middleName = Utils.capitalizeName(nameParts[1]);
      }
      student.lastName = Utils.capitalizeName(nameParts[2]);
    } else if (nameParts.length >= 2) {
      student.lastName = Utils.capitalizeName(nameParts[1]);
    }

    // Generate image path
    student.image = this.generateImagePath(student);

    // Determine blood type
    student.bloodType = this.determineBloodType(student.lastName, bloodData);

    return student;
  },

  generateImagePath(student) {
    if (student.lastName === "Finch-Fletchley") {
      return "images/fletchley_j.png";
    } else if (student.firstName === "Padma") {
      return "images/patil_padma.png";
    } else if (student.firstName === "Parvati") {
      return "images/patil_parvati.png";
    } else if (!student.lastName || student.lastName === "null") {
      return `images/${student.firstName.toLowerCase()}.png`;
    } else {
      return `images/${student.lastName.toLowerCase()}_${student.firstName
        .charAt(0)
        .toLowerCase()}.png`;
    }
  },

  determineBloodType(lastName, bloodData) {
    if (bloodData.half.includes(lastName)) {
      return "Half-Blood";
    } else if (bloodData.pure.includes(lastName)) {
      return "Pure-Blood";
    } else {
      return "Muggle";
    }
  },

  calculateCounts() {
    const students = AppState.students;
    return {
      All: students.filter((s) => !s.expelled).length,
      gryffindor: students.filter(
        (s) => s.house === "Gryffindor" && !s.expelled
      ).length,
      hufflepuff: students.filter(
        (s) => s.house === "Hufflepuff" && !s.expelled
      ).length,
      ravenclaw: students.filter((s) => s.house === "Ravenclaw" && !s.expelled)
        .length,
      slytherin: students.filter((s) => s.house === "Slytherin" && !s.expelled)
        .length,
      "pure-blood": students.filter(
        (s) => s.bloodType === "Pure-Blood" && !s.expelled
      ).length,
      "half-blood": students.filter(
        (s) => s.bloodType === "Half-Blood" && !s.expelled
      ).length,
      muggle: students.filter((s) => s.bloodType === "Muggle" && !s.expelled)
        .length,
      prefects: students.filter((s) => s.prefect && !s.expelled).length,
      inquisitorialsquad: students.filter((s) => s.squad && !s.expelled).length,
      expelled: students.filter((s) => s.expelled).length,
    };
  },

  assignPrefect(student) {
    if (!student || !student.house) {
      console.error("Invalid student data for prefect assignment");
      return false;
    }

    const prefectsInHouse = AppState.students.filter(
      (s) => s.house === student.house && s.prefect && !s.expelled
    );

    if (prefectsInHouse.length < 2) {
      student.prefect = true;
      return true;
    } else {
      UI.showError(`There are already two prefects in ${student.house}.`);
      return false;
    }
  },

  removePrefect(student) {
    student.prefect = false;
  },

  assignToSquad(student) {
    if (student.bloodType === "Pure-Blood" || student.house === "Slytherin") {
      student.squad = !student.squad;
      return true;
    } else {
      UI.showError("Only people of pure blood or in Slytherin can be members");
      return false;
    }
  },

  expelStudent(student) {
    student.expelled = true;
    student.squad = false;
    student.prefect = false;
    console.log(`Expelled student: ${student.firstName} ${student.lastName}`);
  },
};

// Utility Functions
const Utils = {
  capitalizeName(name) {
    if (!name) return null;

    const hyphenIndex = name.indexOf("-");
    if (hyphenIndex !== -1) {
      return (
        name.slice(0, hyphenIndex + 1) +
        name.charAt(hyphenIndex + 1).toUpperCase() +
        name.slice(hyphenIndex + 2).toLowerCase()
      );
    }

    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  },

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  sanitizeInput(input) {
    if (typeof input !== "string") return "";
    return input.replace(/[<>\"'&]/g, "").trim();
  },
};

// Application initialization
function start() {
  console.log("Hogwarts Student Management System starting...");

  DataLoader.loadStudentData();
  EventHandlers.registerEventListeners();
}

// Data Loading Module
const DataLoader = {
  async loadStudentData() {
    const loadingEl = document.querySelector("#list_of_students");
    if (loadingEl) loadingEl.classList.add("loading");

    try {
      const [studentsData, bloodData] = await Promise.all([
        this.fetchData("https://petlatkea.dk/2021/hogwarts/students.json"),
        this.fetchData("https://petlatkea.dk/2021/hogwarts/families.json"),
      ]);

      this.processStudentData(studentsData, bloodData);
    } catch (error) {
      console.error("Failed to load data:", error);
      UI.showError(
        "Failed to load student data. Please check your internet connection and try again."
      );
    } finally {
      if (loadingEl) loadingEl.classList.remove("loading");
    }
  },

  async fetchData(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  processStudentData(studentsData, bloodData) {
    const students = studentsData.map((jsonObject) =>
      StudentManager.createStudent(jsonObject, bloodData)
    );

    AppState.setStudents(students);
    console.log(`Loaded ${students.length} students successfully`);
  },
};

// Event Handlers Module
const EventHandlers = {
  registerEventListeners() {
    // Filter buttons
    document
      .querySelectorAll("[data-action='filter']")
      .forEach((button) =>
        button.addEventListener("click", this.handleFilterClick)
      );

    // Sort buttons
    document
      .querySelectorAll("[data-action='sort']")
      .forEach((button) =>
        button.addEventListener("click", this.handleSortClick)
      );

    // Search input with debouncing
    const searchInput = UI.elements.searchInput;
    if (searchInput) {
      searchInput.addEventListener(
        "input",
        Utils.debounce(this.handleSearch, 300)
      );
    }

    // Keyboard navigation
    document.addEventListener("keydown", this.handleGlobalKeydown);
  },

  handleFilterClick(event) {
    const filter = event.target.dataset.filter;
    const filterTitle = document.querySelector("h1");

    if (filterTitle) {
      filterTitle.firstChild.textContent = `${filter.toUpperCase()} STUDENTS `;
    }

    // Update aria-pressed states
    document
      .querySelectorAll("[data-action='filter']")
      .forEach((btn) => btn.setAttribute("aria-pressed", "false"));
    event.target.setAttribute("aria-pressed", "true");

    AppState.setFilter(filter);
  },

  handleSortClick(event) {
    const sortBy = event.target.dataset.sort;
    const sortDir = event.target.dataset.sortDirection;
    AppState.setSort(sortBy, sortDir);
  },

  handleSearch() {
    const searchInput = UI.elements.searchInput;
    if (!searchInput) return;

    const searchValue = searchInput.value.toLowerCase().trim();

    // Input validation
    if (searchValue.length > 50) {
      UI.showError("Search term too long. Please use fewer characters.");
      return;
    }

    const sanitizedSearch = Utils.sanitizeInput(searchValue);
    const searchResults = SearchManager.searchStudents(sanitizedSearch);
    UI.updateStudentDisplay(searchResults);
  },

  handleGlobalKeydown(event) {
    if (event.key === "Escape") {
      UI.hideError();
      Modal.hide();
    }
  },
};

// Search Management
const SearchManager = {
  searchStudents(searchTerm) {
    if (!searchTerm) {
      return AppState.filteredStudents;
    }

    return AppState.students.filter((student) => {
      const matchesSearch =
        (student.firstName &&
          student.firstName.toLowerCase().includes(searchTerm)) ||
        (student.lastName &&
          student.lastName.toLowerCase().includes(searchTerm)) ||
        (student.nickName &&
          student.nickName.toLowerCase().includes(searchTerm));

      // Apply current filter as well
      const matchesFilter = AppState.filterStudents([student]).length > 0;

      return matchesSearch && matchesFilter;
    });
  },
};

// Modal Management
const Modal = {
  currentStudent: null,
  eventListeners: new Map(),

  showStudentDetails(student) {
    this.currentStudent = student;
    this.clearEventListeners();

    const modal = UI.elements.modal;
    if (!modal) return;

    // Set house styling
    this.setHouseStyling(student.house);

    // Update content
    this.updateModalContent(student);

    // Show modal
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");

    // Set up event listeners
    this.setupEventListeners(student);

    // Focus management for accessibility
    const closeButton = modal.querySelector(".closebutton");
    if (closeButton) closeButton.focus();
  },

  setHouseStyling(house) {
    const popupBox = document.querySelector("#popupBox");
    if (!popupBox) return;

    popupBox.classList.remove(
      "gryffindor",
      "hufflepuff",
      "ravenclaw",
      "slytherin"
    );
    popupBox.classList.add(house.toLowerCase());

    // Update house crest
    const houseCrest = document.getElementById("houseCrest");
    if (houseCrest) {
      houseCrest.src = `images/${house.toLowerCase()}_crest.png`;
    }
  },

  updateModalContent(student) {
    const modal = UI.elements.modal;
    const elements = {
      picture: modal.querySelector("#picture"),
      firstName: modal.querySelector("[data-field=firstName]"),
      middleName: modal.querySelector("[data-field=middleName]"),
      nickName: modal.querySelector("[data-field=nickName]"),
      lastName: modal.querySelector("[data-field=lastName]"),
      gender: modal.querySelector("[data-field=gender]"),
      house: modal.querySelector("[data-field=house]"),
      bloodStatus: modal.querySelector("[data-field=bloodStatus]"),
      isprefect: modal.querySelector("[data-field=isprefect]"),
      issquad: modal.querySelector("[data-field=issquad]"),
    };

    // Update content safely
    if (elements.picture) elements.picture.src = student.image;
    if (elements.firstName) elements.firstName.textContent = student.firstName;
    if (elements.middleName)
      elements.middleName.textContent = student.middleName || "None";
    if (elements.nickName)
      elements.nickName.textContent = student.nickName || "None";
    if (elements.lastName) elements.lastName.textContent = student.lastName;
    if (elements.gender) elements.gender.textContent = student.gender;
    if (elements.house) elements.house.textContent = student.house;
    if (elements.bloodStatus)
      elements.bloodStatus.textContent = student.bloodType;
    if (elements.isprefect)
      elements.isprefect.textContent = student.prefect ? "Yes" : "No";
    if (elements.issquad)
      elements.issquad.textContent = student.squad ? "Yes" : "No";

    // Update button texts
    this.updateButtonTexts(student);
  },

  updateButtonTexts(student) {
    const prefectBtn = document.querySelector("#prefect");
    const squadBtn = document.querySelector("[data-field=squad]");

    if (prefectBtn) {
      prefectBtn.textContent = student.prefect
        ? "Remove Prefect"
        : "Assign Prefect";
    }

    if (squadBtn) {
      squadBtn.textContent = student.squad
        ? "Remove from Inquisitorial Squad"
        : "Assign to Inquisitorial Squad";
    }
  },

  setupEventListeners(student) {
    const modal = UI.elements.modal;

    // Close button
    const closeHandler = () => this.hide();
    const closeBtn = modal.querySelector(".closebutton");
    if (closeBtn) {
      closeBtn.addEventListener("click", closeHandler);
      this.eventListeners.set("close", {
        element: closeBtn,
        handler: closeHandler,
      });
    }

    // Prefect button
    const prefectHandler = () => this.handlePrefectAction(student);
    const prefectBtn = modal.querySelector("#prefect");
    if (prefectBtn) {
      prefectBtn.addEventListener("click", prefectHandler);
      this.eventListeners.set("prefect", {
        element: prefectBtn,
        handler: prefectHandler,
      });
    }

    // Squad button
    const squadHandler = () => this.handleSquadAction(student);
    const squadBtn = modal.querySelector("[data-field=squad]");
    if (squadBtn) {
      squadBtn.addEventListener("click", squadHandler);
      this.eventListeners.set("squad", {
        element: squadBtn,
        handler: squadHandler,
      });
    }

    // Expel button
    const expelHandler = () => this.handleExpelAction(student);
    const expelBtn = modal.querySelector("#expell");
    if (expelBtn) {
      expelBtn.addEventListener("click", expelHandler);
      this.eventListeners.set("expel", {
        element: expelBtn,
        handler: expelHandler,
      });
    }

    // Close on outside click
    const outsideClickHandler = (event) => {
      if (event.target === modal) {
        this.hide();
      }
    };
    modal.addEventListener("click", outsideClickHandler);
    this.eventListeners.set("outside", {
      element: modal,
      handler: outsideClickHandler,
    });
  },

  handlePrefectAction(student) {
    if (student.prefect) {
      StudentManager.removePrefect(student);
    } else {
      StudentManager.assignPrefect(student);
    }

    AppState.updateFilteredStudents();
    this.updateModalContent(student);
  },

  handleSquadAction(student) {
    StudentManager.assignToSquad(student);
    AppState.updateFilteredStudents();
    this.updateModalContent(student);
  },

  handleExpelAction(student) {
    StudentManager.expelStudent(student);
    AppState.updateFilteredStudents();
    this.hide();
  },

  hide() {
    const modal = UI.elements.modal;
    if (modal) {
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
    }
    this.clearEventListeners();
    this.currentStudent = null;
  },

  clearEventListeners() {
    this.eventListeners.forEach(({ element, handler }) => {
      element.removeEventListener("click", handler);
    });
    this.eventListeners.clear();
  },
};

// Legacy function cleanup - these are kept for any remaining dependencies
// but will be removed in future versions

// Deprecated: Use AppState.updateFilteredStudents() instead
function buildList() {
  console.warn(
    "buildList() is deprecated. Use AppState.updateFilteredStudents() instead."
  );
  AppState.updateFilteredStudents();
}

// Deprecated: Use UI.updateCounts() instead
function countAndUpdateDisplay() {
  console.warn(
    "countAndUpdateDisplay() is deprecated. Use UI.updateCounts() instead."
  );
  UI.updateCounts();
}
