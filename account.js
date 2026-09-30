const GAMESHUB_GOOGLE_CLIENT_ID =
  "683249112077-m8qs13n230mmp6qpk71ok5mbmi1s10v0.apps.googleusercontent.com";


window.GAMESHUB_ACCOUNT = {
  signedIn: false,
  user: null
};


function createAccountUI() {
  const wrapper =
    document.createElement("div");

  wrapper.id =
    "gameshubAccount";

  wrapper.innerHTML = `
    <div id="gameshubGoogleButton"></div>

    <div
      id="gameshubAccountStatus"
      style="
        margin-top:8px;
        font:600 12px Arial;
        color:#aab4c5;
        text-align:center;
      "
    >
      SIGN IN TO GAMESHUB
    </div>
  `;

  Object.assign(
    wrapper.style,
    {
      position:
        "fixed",

      top:
        "18px",

      right:
        "18px",

      zIndex:
        "99999",

      padding:
        "12px",

      background:
        "rgba(10,15,24,.92)",

      border:
        "1px solid rgba(255,255,255,.12)",

      borderRadius:
        "12px",

      boxShadow:
        "0 10px 35px rgba(0,0,0,.35)",

      backdropFilter:
        "blur(12px)"
    }
  );

  document.body.appendChild(
    wrapper
  );
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


async function handleGoogleCredential(
  response
) {
  if (
    !response?.credential
  ) {
    setAccountStatus(
      "GOOGLE SIGN-IN FAILED",
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


    if (
      data.needsUsername
    ) {
      setAccountStatus(
        "GOOGLE CONNECTED ✓",
        "#67e8a5"
      );

      alert(
        "Google account connected successfully! Next we'll choose your GAMESHUB username."
      );

      return;
    }


    setAccountStatus(
      `SIGNED IN AS ${data.user.username}`,
      "#67e8a5"
    );


    console.log(
      "GAMESHUB signed in:",
      data.user
    );
  }

  catch (
    error
  ) {
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


function startGoogleSignIn() {
  if (
    !window.google?.accounts?.id
  ) {
    setAccountStatus(
      "GOOGLE FAILED TO LOAD",
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


  google.accounts.id.renderButton(
    container,
    {
      type:
        "standard",

      theme:
        "filled_black",

      size:
        "large",

      text:
        "signin_with",

      shape:
        "rectangular",

      logo_alignment:
        "left",

      width:
        250
    }
  );
}


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
        "GOOGLE FAILED TO LOAD",
        "#ff6b6b"
      );
    };


  document.head.appendChild(
    script
  );
}


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
