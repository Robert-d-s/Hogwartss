"use strict";

window.addEventListener("DOMContentLoaded", start);

let allStudents = [];

// The prototype for all students:
const Student = {
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

const settings = {
  filterBy: "All",
  sortBy: "lastName",
  sortDir: "asc",
  squad: [],
};

function start() {
  console.log("ready");
  loadJSON();
  registerButtons();

  document.querySelector("#search").addEventListener("input", searchStudents);
}

async function loadJSON() {
  let [studentsData, bloodData] = await Promise.all([
    fetch("https://petlatkea.dk/2021/hogwarts/students.json").then((response) =>
      response.json()
    ),
    fetch("https://petlatkea.dk/2021/hogwarts/families.json").then((response) =>
      response.json()
    ),
  ]);
  preapareObjects(studentsData, bloodData);
}

function registerButtons() {
  document
    .querySelectorAll("[data-action='filter']")
    .forEach((p) => p.addEventListener("click", selectFilter));
  document
    .querySelectorAll("[data-action='sort']")
    .forEach((button) => button.addEventListener("click", selectSort));
}

//clean the data
function preapareObjects(data1, data2) {
  data1.forEach((jsonObject) => {
    const student = Object.create(Student);
    //The trim() method removes whitespace from both ends of a string and returns a new string, without modifying the original string

    //The regular expression /\s+/ matches one or more whitespace characters (e.g., space, tab, newline) in the string. This means that the string will be split wherever there is one or more whitespace characters
    let nameParts = jsonObject.fullname.trim().split(/\s+/);

    // Capitalize the name parts correctly
    student.firstName = capitalizeName(nameParts[0]);

    student.house = capitalizeName(jsonObject.house.trim());
    student.gender = capitalizeName(jsonObject.gender.trim());

    if (nameParts.length === 3) {
      if (nameParts[1].startsWith('"') && nameParts[1].endsWith('"')) {
        student.nickName = capitalizeName(nameParts[1].slice(1, -1));
      } else {
        student.middleName = capitalizeName(nameParts[1]);
      }
      student.lastName = capitalizeName(nameParts[2]);
    } else {
      student.lastName = capitalizeName(nameParts[1]);
    }

    if (student.lastName === "Finch-Fletchley") {
      student.image = `images/fletchley_j.png`;
    } else if (student.firstName === "Padma") {
      student.image = `images/patil_padma.png`;
    } else if (student.firstName === "Parvati") {
      student.image = `images/patil_parvati.png`;
    } else if (student.lastName === "null") {
      student.image = `images/${student.firstName.toLowerCase()}.png`;
    } else if (student.lastName) {
      student.image = `images/${student.lastName.toLowerCase()}_${student.firstName
        .charAt(0)
        .toLowerCase()}.png`;
    }

    const halfBloods = data2.half;
    const pureBloods = data2.pure;

    if (halfBloods.includes(student.lastName)) {
      student.bloodType = "Half-Blood";
    } else if (pureBloods.includes(student.lastName)) {
      student.bloodType = "Pure-Blood";
    } else {
      student.bloodType = "Muggle";
    }

    allStudents.push(student);
    console.log(
      `Created student: ${student.firstName} ${student.lastName}, expelled: ${student.expelled}`
    );
  });

  //------------- BUILD LIST ---------

  buildList();
}

function capitalizeName(name) {
  //checks whether the name argument is falsy (i.e., null, undefined, false, 0, "", NaN). If it is, the function immediately returns null
  if (!name) return null;

  const hyphenIndex = name.indexOf("-");

  //find the index of the first occurrence of a hyphen (-) in the name. If there is no hyphen, the hyphenIndex variable will be set to -1.
  if (hyphenIndex !== -1) {
    return (
      name.slice(0, hyphenIndex + 1) +
      name.charAt(hyphenIndex + 1).toUpperCase() +
      name.slice(hyphenIndex + 2).toLowerCase()
    );
  }

  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

function displayList(student) {
  // clear the list
  document.querySelector("#list tbody").innerHTML = "";

  // update student count
  // document.querySelector("#studentCount").textContent = student.length;
  const studentCountElement = document.querySelector("#studentCount");
  if (studentCountElement) {
    studentCountElement.textContent = student.length;
  }

  // build a new list
  student.forEach(displayStudent);
}

function displayStudent(student) {
  // create clone
  const clone = document
    .querySelector("template#student")
    .content.cloneNode(true);

  // set clone data
  clone.querySelector("[data-field=firstName]").textContent = student.firstName;
  clone.querySelector("[data-field=lastName]").textContent = student.lastName;
  clone.querySelector("#image").src = student.image;
  clone.querySelector("#image").addEventListener(`click`, () => {
    displayStudentCard(student);
  });
  // append clone to list
  document.querySelector("#list tbody").appendChild(clone);
}

// ______________________prefect_
function assignPrefect(student) {
  const prefectsInHouse = allStudents.filter(
    (s) => s.house === student.house && s.prefect
  );
  if (prefectsInHouse.length < 2) {
    student.prefect = true;
  } else {
    // Show the modal with the alert message
    const modal = document.querySelector("#alertModal");
    document.querySelector(
      "#alertMessage"
    ).textContent = `There are already two prefects in ${student.house}.`;
    modal.style.display = "block";

    // When the user clicks on the close button, close the modal
    document.querySelector(".close-button").onclick = function () {
      modal.style.display = "none";
    };

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function (event) {
      if (event.target == modal) {
        modal.style.display = "none";
      }
    };
  }

  // {
  //   console.log(`There are already two prefects in ${student.house}.`);
  // }
}

function removePrefect(student) {
  student.prefect = false;
}

// function handlePrefectButtonClick() {
//   if (this.student.prefect) {
//     removePrefect(this.student);
//   } else {
//     assignPrefect(this.student);
//   }
//   displayStudentCard(this.student); // Refresh the card to show updated prefect status
//   countAndUpdateDisplay();
// }

function handlePrefectButtonClick() {
  if (this.student.prefect) {
    removePrefect(this.student);
  } else {
    assignPrefect(this.student);
  }
  displayStudentCard(this.student); // Refresh the card to show updated prefect status
  countAndUpdateDisplay();

  // If the current filter is "prefects", refresh the list of prefects
  if (settings.filterBy === "prefects") {
    const prefectStudents = allStudents.filter(
      (student) => student.prefect && !student.expelled
    );
    displayList(prefectStudents);
  }
}

function expelStudent(student) {
  student.expelled = true;
  countAndUpdateDisplay();
  student.squad = false;
  student.prefect = false;
  console.log(
    `Expelled student: ${student.firstName} ${student.lastName}, expelled: ${student.expelled}`
  );

  // buildList(true); // Refresh the list to reflect the updated expulsion status
  // countAndUpdateDisplay();
}

// ------------------------Expel-----------

// -------------------- POPUP BOX ---------------------------

function displayStudentCard(student) {
  if (student.house === "Gryffindor") {
    document
      .querySelector("#popupBox")
      .classList.remove("gryffindor", "hufflepuff", "ravenclaw", "slytherin");
    document.querySelector("#popupBox").classList.add("gryffindor");
    console.log(`i am gryffindor`);
  } else if (student.house === "Hufflepuff") {
    document
      .querySelector("#popupBox")
      .classList.remove("gryffindor", "hufflepuff", "ravenclaw", "slytherin");
    document.querySelector("#popupBox").classList.add("hufflepuff");
    console.log(`i am hufflepuff`);
  } else if (student.house === "Ravenclaw") {
    document
      .querySelector("#popupBox")
      .classList.remove("gryffindor", "hufflepuff", "ravenclaw", "slytherin");
    document.querySelector("#popupBox").classList.add("ravenclaw");
    console.log(`i am ravenclaw`);
  } else {
    document
      .querySelector("#popupBox")
      .classList.remove("gryffindor", "hufflepuff", "ravenclaw", "slytherin");
    document.querySelector("#popupBox").classList.add("slytherin");
    console.log(`i am slytherin`);
  }

  let popup = document.querySelector(".modal");
  popup.classList.remove("hidden");

  popup.querySelector("#picture").src = student.image;
  popup.querySelector("[data-field=firstName]").textContent = student.firstName;
  popup.querySelector("[data-field=middleName]").textContent =
    student.middleName;
  popup.querySelector("[data-field=nickName").textContent = student.nickName;
  popup.querySelector("[data-field=lastName]").textContent = student.lastName;
  popup.querySelector("[data-field=gender").textContent = student.gender;
  popup.querySelector("[data-field=house]").textContent = student.house;
  popup.querySelector("[data-field=bloodStatus]").textContent =
    student.bloodType;
  // popup.querySelector("[data-field=issquad]").textContent = student.squad;
  popup.querySelector("[data-field=issquad]").textContent = student.squad
    ? "Yes"
    : "No";
  popup
    .querySelector(".closebutton")
    .addEventListener("click", closeStudentCard);

  popup
    .querySelector("[data-field=squad]")
    .addEventListener("click", addToSquad);

  if (student.squad) {
    popup.querySelector("[data-field=squad]").textContent =
      "Remove from Inquisitorial Squad";
  } else {
    popup.querySelector("[data-field=squad]").textContent =
      "Assign to Inquisitorial Squad";
  }

  // ------------------expel--------------

  const expelButton = popup.querySelector("#expell");
  // Remove all existing event listeners from the button
  let newButton = expelButton.cloneNode(true);
  expelButton.parentNode.replaceChild(newButton, expelButton);

  // Add the new event listener to the new button
  newButton.addEventListener("click", () => {
    expelStudentAndUpdateView(student);
    displayStudentCard(student); // Refresh the card to show updated expulsion status
  });

  // ------------------expel--------------

  // -----------------Prefect-----------------------

  popup.querySelector("[data-field=isprefect]").textContent = student.prefect
    ? "Yes"
    : "No";

  const prefectButton = popup.querySelector("#prefect");
  prefectButton.removeEventListener("click", handlePrefectButtonClick); // Remove existing event listener
  prefectButton.student = student; // Store the student data in the button element
  prefectButton.addEventListener("click", handlePrefectButtonClick); // Add new event listener
  if (student.prefect) {
    prefectButton.textContent = "Remove Prefect";
  } else {
    prefectButton.textContent = "Assign Prefect";
  }
  // -----------------Prefect-----------------------

  function closeStudentCard() {
    popup.classList.add("hidden");
    popup
      .querySelector("[data-field=squad]")
      .removeEventListener("click", addToSquad);
  }
  // -------------------- INQUISITORIAL SQUAD ---------------------------
  function addToSquad() {
    popup
      .querySelector("[data-field=squad]")
      .removeEventListener("click", addToSquad);

    if (student.bloodType === "Pure-Blood" || student.house === "Slytherin") {
      student.squad = !student.squad;

      console.log(` person is pure blood or slytherin`, settings.squad);
      console.log(student.squad);
    } else {
      // Show the modal with the alert message
      const modal = document.querySelector("#alertModal");
      document.querySelector("#alertMessage").textContent =
        "Only people of pure blood or in Slytherin can be members";
      modal.style.display = "block";

      // When the user clicks on the close button, close the modal
      document.querySelector(".close-button").onclick = function () {
        modal.style.display = "none";
      };

      // When the user clicks anywhere outside of the modal, close it
      window.onclick = function (event) {
        if (event.target == modal) {
          modal.style.display = "none";
        }
      };
    }

    // {
    //   alert("only people of pure blood or in Slytherin can be members");
    //   console.log(` person cannot be squad`, student.bloodType, student.house);
    // }
    buildList();

    displayStudentCard(student);
  }
}

function buildList(skipFiltering = false) {
  let currentList = allStudents;

  if (!skipFiltering) {
    currentList = filterList(allStudents);
  }

  const sortedList = sortList(currentList);

  displayList(sortedList);
  // const counts = countAndUpdateDisplay();
  // countAndUpdateDisplay(counts);
  countAndUpdateDisplay();
}

// -------------------- FILTERING ---------------------------

function filterBySquad() {
  console.log("I am in filterbySquad");
  settings.filterBy = "inquisitorialsquad";
  settings.squad = allStudents.filter((student) => student.squad);

  displayList(settings.squad);
}

function selectFilter(event) {
  const filter = event.target.dataset.filter;
  document.querySelector("h2").textContent = filter.toUpperCase();

  if (filter === "inquisitorialsquad") {
    filterBySquad();
  } else {
    setFilter(filter);
  }
}

function setFilter(filter) {
  settings.filterBy = filter;
  buildList();
}

function filterList(filteredList) {
  if (settings.filterBy === "expelled") {
    console.log(`Filtering expelled students...`);
    filteredList = allStudents.filter((student) => student.expelled);
  } else if (settings.filterBy === "inquisitorialsquad") {
    filteredList = allStudents.filter(
      (student) => student.squad && !student.expelled
    );
  } else if (settings.filterBy === "prefects") {
    filteredList = allStudents.filter(
      (student) => student.prefect && !student.expelled
    );
  } else if (settings.filterBy !== "All") {
    // Exclude expelled students when filtering by other criteria
    filteredList = allStudents.filter(
      (student) => !student.expelled && filterBy(student)
    );
  } else {
    // Exclude expelled students from the main list
    filteredList = allStudents.filter((student) => !student.expelled);
  }
  return filteredList;
}

function filterBy(student) {
  if (student.house.toLowerCase() === settings.filterBy) {
    return true;
  }

  if (student.bloodType.toLowerCase() === settings.filterBy) {
    return true;
  }
}

// -------------------- SORTING ---------------------------

function selectSort(event) {
  const sortBy = event.target.dataset.sort;
  //check html for data set
  const sortDir = event.target.dataset.sortDirection;
  setSort(sortBy, sortDir);
}

function setSort(sortBy, sortDir) {
  settings.sortBy = sortBy;
  settings.sortDir = sortDir;
  buildList(sortBy, sortDir);
}

function sortList(sortedList) {
  let direction = 1;

  if (settings.sortDir === "desc") {
    direction = -1;
  }

  sortedList = sortedList.sort(sortByProperty);

  function sortByProperty(studentA, studentB) {
    if (studentA[settings.sortBy] < studentB[settings.sortBy]) {
      return -1 * direction;
    } else {
      return 1 * direction;
    }
  }
  return sortedList;
}

// ------------search-----
function searchStudents() {
  const searchValue = document.querySelector("#search").value.toLowerCase();
  const searchedStudents = allStudents.filter(
    (student) =>
      (student.firstName &&
        student.firstName.toLowerCase().includes(searchValue)) ||
      (student.lastName && student.lastName.toLowerCase().includes(searchValue))
  );
  displayList(searchedStudents);
}

function countAndUpdateDisplay() {
  const counts = {
    All: allStudents.filter((student) => !student.expelled).length,
    gryffindor: allStudents.filter(
      (student) => student.house === "Gryffindor" && !student.expelled
    ).length,
    hufflepuff: allStudents.filter(
      (student) => student.house === "Hufflepuff" && !student.expelled
    ).length,
    ravenclaw: allStudents.filter(
      (student) => student.house === "Ravenclaw" && !student.expelled
    ).length,
    slytherin: allStudents.filter(
      (student) => student.house === "Slytherin" && !student.expelled
    ).length,
    "pure-blood": allStudents.filter(
      (student) => student.bloodType === "Pure-Blood" && !student.expelled
    ).length,
    "half-blood": allStudents.filter(
      (student) => student.bloodType === "Half-Blood" && !student.expelled
    ).length,
    muggle: allStudents.filter(
      (student) => student.bloodType === "Muggle" && !student.expelled
    ).length,
    prefects: allStudents.filter(
      (student) => student.prefect && !student.expelled
    ).length,
    inquisitorialsquad: allStudents.filter(
      (student) => student.squad && !student.expelled
    ).length,
    enrolled: allStudents.filter((student) => !student.expelled).length,
    expelled: allStudents.filter((student) => student.expelled).length,
  };

  for (const filter in counts) {
    const count = counts[filter];
    const filterElement = document.querySelector(`p[data-filter="${filter}"]`);
    if (filterElement) {
      const spanElement = filterElement.querySelector("span");
      if (spanElement) {
        spanElement.textContent = count;
      }
    }
  }
}

function expelStudentAndUpdateView(student) {
  console.log("Expelling student:", student.firstName, student.lastName);
  // Expel the student
  expelStudent(student);

  switch (settings.filterBy) {
    case "inquisitorialsquad":
      // If the current filter is the Inquisitorial Squad, refresh this view
      filterBySquad();
      break;
    case "prefects":
      // If the current filter is the Prefects, refresh this view
      const prefectStudents = allStudents.filter(
        (student) => student.prefect && !student.expelled
      );
      console.log("Updating Prefects list:", prefectStudents);
      displayList(prefectStudents);
      break;
    default:
      // Otherwise, refresh the main list
      console.log("Updating main list");
      buildList();
      break;
  }
}
