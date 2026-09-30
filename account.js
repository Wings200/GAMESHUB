const GAMESHUB_GOOGLE_CLIENT_ID =
  "683249112077-m8qs13n230mmp6qpk71ok5mbmi1s10v0.apps.googleusercontent.com";


window.GAMESHUB_ACCOUNT = {
  signedIn: false,
  user: null
};


/* =========================================================
   UI
========================================================= */

function createAccountUI() {
  const wrapper =
    document.createElement("div");

  wrapper.id =
    "gameshubAccount";

  wrapper.innerHTML = `
    <div id="gameshubGoogleButton"></div>

    <div id="gameshubAccountStatus">
      SIGN IN
    </div>
  `;


  const style =
    document.createElement("style");

  style.textContent = `
    #gameshubAccount {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
      margin-left: 14px;
    }

    #gameshubGoogleButton {
      display: flex;
      align-items: center;
    }

    #gameshubAccountStatus {
      display: none;
      font-family: Arial, sans-serif;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .08em;
      color: #aab4c5;
      white-space: nowrap;
    }

    @media (max-width: 850px) {
      #gameshubAccount {
        margin-left: 6px;
      }
    }
  `;

  document.head.appendChild(
    style
  );


  /*
    Put the account button INSIDE the existing header.
  */

  const header =
    document.querySelector(
      "header"
    );


  if (header) {
    const inner =
      header.querySelector(
        ".header-inner"
      )
      ||
      header.querySelector(
        ".nav-inner"
      )
      ||
      header.querySelector(
        ".topbar-inner"
      )
      ||
      header.firstElementChild
      ||
      header;


    /*
      Try putting it before the logout button.
    */

    const logout =
      inner.querySelector(
        'button[type="button"], button, .logout, #logoutBtn'
      );


    if (logout) {
      inner.insertBefore(
        wrapper,
        logout
      );
    }

    else {
      inner.appendChild(
        wrapper
      );
    }
  }

  else {
    /*
      Fallback:
      still part of page flow — NEVER floating.
    */

    document.body.prepend(
      wrapper
    );
  }
}


function setAccountStatus(
  text,
  color = "#aab4c5"
) {
  const status =
    document.getElementById(
      "gameshubAccountStatus"
    );

  if (!status) {
    return;
  }

  status.textContent =
    text;

  status.style.color =
    color;
}


/* =========================================================
   GOOGLE RESPONSE
========================================================= */

async function handleGoogleCredential(
  response
) {
  if (!response?.credential) {
    setAccountStatus(
      "SIGN-IN FAILED",
      "#ff6b6b"
    );

    return;
  }


  setAccountStatus(
    "SIGNING IN...",
    "#ffffff"
  );


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

    window.GAMESHUB_ACCOUNT.user =
      data.user;


    /*
      First ever GAMESHUB login.
    */

    if (data.needsUsername) {
      setAccountStatus(
        "CONNECTED ✓",
        "#67e8a5"
      );

      alert(
        "Google account connected! Next you'll choose your GAMESHUB username."
      );

      return;
    }


    setAccountStatus(
      data.user.username,
      "#67e8a5"
    );


    console.log(
      "GAMESHUB signed in:",
      data.user
    );
  }

  catch (error) {
    console.error(
      "GAMESHUB Google sign-in failed:",
      error
    );


    setAccountStatus(
      error.message ||
      "SIGN-IN FAILED",
      "#ff6b6b"
    );
  }
}


/* =========================================================
   GOOGLE BUTTON
========================================================= */

function startGoogleSignIn() {
  if (
    !window.google
      ?.accounts
      ?.id
  ) {
    setAccountStatus(
      "GOOGLE FAILED",
      "#ff6b6b"
    );

    return;
  }


  google.accounts.id.initialize({
    client_id:
      GAMESHUB_GOOGLE_CLIENT_ID,

    callback:
      handleGoogleCredential,

    auto_select:
      false
  });


  const container =
    document.getElementById(
      "gameshubGoogleButton"
    );


  if (!container) {
    return;
  }


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
   LOAD GOOGLE
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
    startGoogleSignIn;


  script.onerror =
    () => {
      setAccountStatus(
        "GOOGLE FAILED",
        "#ff6b6b"
      );
    };


  document.head.appendChild(
    script
  );
}


/* =========================================================
   START
========================================================= */

function initializeGameshubAccount() {
  createAccountUI();

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
