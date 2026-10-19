const GAMESHUB_GOOGLE_CLIENT_ID =
  "683249112077-m8qs13n230mmp6qpk71ok5mbmi1s10v0.apps.googleusercontent.com";


window.GAMESHUB_ACCOUNT = {
  signedIn: false,
  guest: false,
  user: null
};


let googleLoaded =
  false;

let usernameCheckTimer =
  null;


/* =========================================================
   ACCOUNT UI
========================================================= */

function createAccountUI() {
  const wrapper =
    document.createElement(
      "div"
    );


  wrapper.id =
    "gameshubAccount";


  wrapper.innerHTML = `
    <div id="gameshubGoogleButton"></div>

    <button
      id="gameshubGuestButton"
      type="button"
    >
      CONTINUE AS GUEST
    </button>

    <button
      id="gameshubAccountButton"
      type="button"
      hidden
    >
      ACCOUNT
    </button>

    <div
      id="gameshubAccountStatus"
    >
      SIGN IN
    </div>
  `;


  const modal =
    document.createElement(
      "div"
    );


  modal.id =
    "gameshubUsernameModal";


  modal.innerHTML = `
    <div class="gh-username-card">

      <div class="gh-username-eyebrow">
        GAMESHUB ACCOUNT
      </div>

      <h2>
        Choose your username
      </h2>

      <p>
        This is the name other players will see
        in games, leaderboards, and multiplayer.
      </p>

      <input
        id="gameshubUsernameInput"
        type="text"
        maxlength="18"
        autocomplete="off"
        spellcheck="false"
        placeholder="Username"
      >

      <div
        id="gameshubUsernameStatus"
        class="gh-username-status"
      >
        3–18 characters. Letters, numbers, and _ only.
      </div>

      <button
        id="gameshubSaveUsername"
        type="button"
        disabled
      >
        SAVE USERNAME
      </button>

    </div>
  `;


  document.body.appendChild(
    modal
  );


  const style =
    document.createElement(
      "style"
    );


  style.textContent = `
    #gameshubAccount {
      display:flex;
      align-items:center;
      gap:10px;
      flex-shrink:0;
      margin-left:14px;
    }

    #gameshubGoogleButton {
      display:flex;
      align-items:center;
    }

    #gameshubAccountStatus {
      display:none;
    }

    #gameshubGuestButton,
    #gameshubAccountButton {
      border:1px solid rgba(255,255,255,.16);
      background:rgba(255,255,255,.06);
      color:#fff;
      padding:9px 14px;
      border-radius:8px;
      font-size:12px;
      font-weight:800;
      letter-spacing:.06em;
      cursor:pointer;
      white-space:nowrap;
    }

    #gameshubGuestButton {
      color:#b8c9e8;
      border-color:rgba(103,139,196,.35);
      background:rgba(63,92,138,.12);
      font-size:10px;
    }

    #gameshubGuestButton:hover {
      color:#fff;
      border-color:rgba(111,157,231,.55);
      background:rgba(65,105,170,.20);
    }

    #gameshubGuestButton:disabled {
      opacity:.5;
      cursor:default;
    }

    #gameshubAccountButton:hover {
      background:rgba(255,255,255,.10);
    }

    #gameshubUsernameModal {
      position:fixed;
      inset:0;
      z-index:999999;
      display:none;
      align-items:center;
      justify-content:center;
      padding:24px;

      background:
        rgba(3,7,13,.78);

      backdrop-filter:
        blur(14px);
    }

    #gameshubUsernameModal.open {
      display:flex;
    }

    .gh-username-card {
      width:min(440px, 100%);
      padding:30px;
      border-radius:18px;

      background:
        #0c121d;

      border:
        1px solid rgba(255,255,255,.12);

      box-shadow:
        0 24px 80px rgba(0,0,0,.5);

      color:#fff;
    }

    .gh-username-eyebrow {
      margin-bottom:8px;

      color:#6ea8ff;

      font-size:11px;
      font-weight:900;
      letter-spacing:.16em;
    }

    .gh-username-card h2 {
      margin:0 0 10px;

      font-size:28px;
    }

    .gh-username-card p {
      margin:0 0 22px;

      color:#98a4b8;

      font-size:14px;
      line-height:1.5;
    }

    #gameshubUsernameInput {
      width:100%;
      box-sizing:border-box;

      padding:14px 15px;

      border-radius:10px;

      border:
        1px solid rgba(255,255,255,.15);

      outline:none;

      background:
        #070c14;

      color:#fff;

      font-size:17px;
      font-weight:700;
    }

    #gameshubUsernameInput:focus {
      border-color:#5a9cff;
    }

    .gh-username-status {
      min-height:18px;

      margin-top:10px;

      color:#98a4b8;

      font-size:12px;
      font-weight:700;
    }

    #gameshubSaveUsername {
      width:100%;

      margin-top:20px;

      padding:14px;

      border:0;
      border-radius:10px;

      background:#397dff;

      color:#fff;

      font-size:13px;
      font-weight:900;
      letter-spacing:.06em;

      cursor:pointer;
    }

    #gameshubSaveUsername:disabled {
      opacity:.38;
      cursor:not-allowed;
    }
  `;


  document.head.appendChild(
    style
  );


  /*
    Put account controls directly in the homepage header,
    immediately before the existing logout button.
  */

  const header =
    document.querySelector(
      "header"
    );


  if (header) {
    const logout =
      header.querySelector(
        "#logoutButton, .logout, #logoutBtn"
      );


    if (logout) {
      header.insertBefore(
        wrapper,
        logout
      );
    }

    else {
      header.appendChild(
        wrapper
      );
    }
  }

  else {
    document.body.prepend(
      wrapper
    );
  }


  setupUsernameEvents();
  setupGuestEvents();
}


/* =========================================================
   ACCOUNT STATE
========================================================= */

function showGoogleButton() {
  const googleContainer =
    document.getElementById(
      "gameshubGoogleButton"
    );

  const guestButton =
    document.getElementById(
      "gameshubGuestButton"
    );

  const accountButton =
    document.getElementById(
      "gameshubAccountButton"
    );


  if (googleContainer) {
    googleContainer.style.display =
      "flex";
  }


  if (guestButton) {
    guestButton.hidden =
      false;
  }


  if (accountButton) {
    accountButton.hidden =
      true;
  }
}


function showSignedInAccount(
  user,
  guest = false
) {
  const googleContainer =
    document.getElementById(
      "gameshubGoogleButton"
    );

  const guestButton =
    document.getElementById(
      "gameshubGuestButton"
    );

  const accountButton =
    document.getElementById(
      "gameshubAccountButton"
    );


  if (googleContainer) {
    googleContainer.style.display =
      "none";
  }


  if (guestButton) {
    guestButton.hidden =
      true;
  }


  if (accountButton) {
    accountButton.hidden =
      false;

    accountButton.textContent =
      user?.username
      ?
      (
        guest
          ?
          user.username
          :
          `@${user.username}`
      )
      :
      "ACCOUNT";

    accountButton.title =
      guest
        ?
        "Local GAMESHUB guest"
        :
        "GAMESHUB account";
  }
}


function openUsernamePicker() {
  const modal =
    document.getElementById(
      "gameshubUsernameModal"
    );


  modal?.classList.add(
    "open"
  );


  setTimeout(
    () => {
      document
        .getElementById(
          "gameshubUsernameInput"
        )
        ?.focus();
    },
    100
  );
}


function closeUsernamePicker() {
  document
    .getElementById(
      "gameshubUsernameModal"
    )
    ?.classList.remove(
      "open"
    );
}


/* =========================================================
   LOAD CURRENT SESSION
========================================================= */

async function loadCurrentAccount() {
  try {
    const response =
      await fetch(
        "/api/account/me",
        {
          credentials:
            "same-origin"
        }
      );


    const data =
      await response.json();


    if (
      !response.ok
      ||
      !data.ok
    ) {
      throw new Error(
        data.error
        ||
        "Could not load account."
      );
    }


    if (
      !data.signedIn
    ) {
      window.GAMESHUB_ACCOUNT.signedIn =
        false;

      window.GAMESHUB_ACCOUNT.guest =
        false;

      window.GAMESHUB_ACCOUNT.user =
        null;

      window.dispatchEvent(new Event("gameshub-account-change"));

      showGoogleButton();

      return;
    }


    window.GAMESHUB_ACCOUNT.signedIn =
      true;

    window.GAMESHUB_ACCOUNT.guest =
      Boolean(
        data.guest
      );

    window.GAMESHUB_ACCOUNT.user =
      data.user;

    window.dispatchEvent(new Event("gameshub-account-change"));


    showSignedInAccount(
      data.user,
      Boolean(
        data.guest
      )
    );


    if (
      data.needsUsername
    ) {
      openUsernamePicker();
    }
  }

  catch (error) {
    console.error(
      "GAMESHUB account load failed:",
      error
    );

    showGoogleButton();
  }
}


/* =========================================================
   USERNAME AVAILABILITY
========================================================= */

async function checkUsername(
  username
) {
  const status =
    document.getElementById(
      "gameshubUsernameStatus"
    );

  const saveButton =
    document.getElementById(
      "gameshubSaveUsername"
    );


  saveButton.disabled =
    true;


  if (
    username.length < 3
  ) {
    status.textContent =
      "Username must be at least 3 characters.";

    status.style.color =
      "#98a4b8";

    return;
  }


  try {
    status.textContent =
      "Checking availability...";

    status.style.color =
      "#98a4b8";


    const response =
      await fetch(
        `/api/account/username?username=${
          encodeURIComponent(
            username
          )
        }`
      );


    const data =
      await response.json();


    if (
      !data.valid
    ) {
      status.textContent =
        data.error
        ||
        "Invalid username.";

      status.style.color =
        "#ff6b6b";

      return;
    }


    if (
      !data.available
    ) {
      status.textContent =
        "That username is already taken.";

      status.style.color =
        "#ff6b6b";

      return;
    }


    status.textContent =
      "Username available ✓";

    status.style.color =
      "#67e8a5";

    saveButton.disabled =
      false;
  }

  catch (error) {
    status.textContent =
      "Could not check username.";

    status.style.color =
      "#ff6b6b";
  }
}


/* =========================================================
   SAVE USERNAME
========================================================= */

async function saveUsername() {
  const input =
    document.getElementById(
      "gameshubUsernameInput"
    );

  const status =
    document.getElementById(
      "gameshubUsernameStatus"
    );

  const button =
    document.getElementById(
      "gameshubSaveUsername"
    );


  const username =
    input.value.trim();


  button.disabled =
    true;

  button.textContent =
    "SAVING...";


  try {
    const response =
      await fetch(
        "/api/account/username",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          credentials:
            "same-origin",

          body:
            JSON.stringify({
              username
            })
        }
      );


    const data =
      await response.json();


    if (
      !response.ok
      ||
      !data.ok
    ) {
      throw new Error(
        data.error
        ||
        "Could not save username."
      );
    }


    window.GAMESHUB_ACCOUNT.signedIn =
      true;

    window.GAMESHUB_ACCOUNT.guest =
      false;

    window.GAMESHUB_ACCOUNT.user =
      data.user;

    window.dispatchEvent(new Event("gameshub-account-change"));


    showSignedInAccount(
      data.user,
      false
    );


    closeUsernamePicker();


    console.log(
      "GAMESHUB username saved:",
      data.user.username
    );
  }

  catch (error) {
    status.textContent =
      error.message;

    status.style.color =
      "#ff6b6b";

    button.disabled =
      false;
  }

  finally {
    button.textContent =
      "SAVE USERNAME";
  }
}


/* =========================================================
   USERNAME EVENTS
========================================================= */

function setupUsernameEvents() {
  const input =
    document.getElementById(
      "gameshubUsernameInput"
    );

  const saveButton =
    document.getElementById(
      "gameshubSaveUsername"
    );


  input.addEventListener(
    "input",
    () => {
      let value =
        input.value;


      value =
        value
          .replace(
            /[^A-Za-z0-9_]/g,
            ""
          )
          .slice(
            0,
            18
          );


      input.value =
        value;


      clearTimeout(
        usernameCheckTimer
      );


      usernameCheckTimer =
        setTimeout(
          () => {
            checkUsername(
              value
            );
          },
          300
        );
    }
  );


  input.addEventListener(
    "keydown",
    event => {
      if (
        event.key ===
        "Enter"
        &&
        !saveButton.disabled
      ) {
        saveUsername();
      }
    }
  );


  saveButton.addEventListener(
    "click",
    saveUsername
  );
}



/* =========================================================
   GUEST MODE
========================================================= */

async function createGuestAccount() {
  const button =
    document.getElementById(
      "gameshubGuestButton"
    );


  if (
    !button
  ) {
    return;
  }


  const originalText =
    button.textContent;


  button.disabled =
    true;

  button.textContent =
    "CREATING GUEST...";


  try {
    const response =
      await fetch(
        "/api/account/guest",
        {
          method:
            "POST",

          credentials:
            "same-origin"
        }
      );


    const data =
      await response
        .json()
        .catch(
          () => null
        );


    if (
      !response.ok
      ||
      !data?.ok
      ||
      !data.user?.username
    ) {
      throw new Error(
        data?.error
        ||
        "Could not create guest account."
      );
    }


    window.GAMESHUB_ACCOUNT.signedIn =
      true;

    window.GAMESHUB_ACCOUNT.guest =
      true;

    window.GAMESHUB_ACCOUNT.user =
      data.user;

    window.dispatchEvent(new Event("gameshub-account-change"));


    showSignedInAccount(
      data.user,
      true
    );
  }

  catch (
    error
  ) {
    console.error(
      "GAMESHUB guest creation failed:",
      error
    );


    alert(
      error.message
      ||
      "Could not create guest account."
    );


    button.disabled =
      false;

    button.textContent =
      originalText;
  }
}


function setupGuestEvents() {
  document
    .getElementById(
      "gameshubGuestButton"
    )
    ?.addEventListener(
      "click",
      createGuestAccount
    );
}


/* =========================================================
   GOOGLE LOGIN
========================================================= */

async function handleGoogleCredential(
  response
) {
  if (
    !response?.credential
  ) {
    return;
  }


  try {
    const request =
      await fetch(
        "/api/account/google",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          credentials:
            "same-origin",

          body:
            JSON.stringify({
              credential:
                response.credential
            })
        }
      );


    const data =
      await request.json();


    if (
      !request.ok
      ||
      !data.ok
    ) {
      throw new Error(
        data.error
        ||
        "Google sign-in failed."
      );
    }


    window.GAMESHUB_ACCOUNT.signedIn =
      true;

    window.GAMESHUB_ACCOUNT.guest =
      false;

    window.GAMESHUB_ACCOUNT.user =
      data.user;

    window.dispatchEvent(new Event("gameshub-account-change"));


    showSignedInAccount(
      data.user,
      false
    );


    if (
      data.needsUsername
    ) {
      openUsernamePicker();
    }
  }

  catch (error) {
    console.error(
      "Google sign-in failed:",
      error
    );

    alert(
      error.message
      ||
      "Google sign-in failed."
    );
  }
}


/* =========================================================
   GOOGLE BUTTON
========================================================= */

function renderGoogleButton() {
  if (
    !googleLoaded
    ||
    window.GAMESHUB_ACCOUNT.signedIn
  ) {
    return;
  }


  const container =
    document.getElementById(
      "gameshubGoogleButton"
    );


  if (!container) {
    return;
  }


  container.innerHTML =
    "";


  google.accounts.id.initialize({
    client_id:
      GAMESHUB_GOOGLE_CLIENT_ID,

    callback:
      handleGoogleCredential,

    auto_select:
      false
  });


  google.accounts.id.renderButton(
    container,
    {
      type:
        "standard",

      theme:
        "filled_black",

      size:
        "medium",

      text:
        "signin_with",

      shape:
        "rectangular",

      logo_alignment:
        "left",

      width:
        190
    }
  );
}


/* =========================================================
   GOOGLE LIBRARY
========================================================= */

function loadGoogleLibrary() {
  const script =
    document.createElement(
      "script"
    );


  script.src =
    "https://accounts.google.com/gsi/client";


  script.async =
    true;


  script.defer =
    true;


  script.onload =
    () => {
      googleLoaded =
        true;

      renderGoogleButton();
    };


  document.head.appendChild(
    script
  );
}


/* =========================================================
   START
========================================================= */

async function initializeGameshubAccount() {
  createAccountUI();

  await loadCurrentAccount();

  loadGoogleLibrary();
}


if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initializeGameshubAccount
  );
}

else {
  initializeGameshubAccount();
}
