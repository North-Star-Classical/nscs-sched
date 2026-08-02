/* Auth gate — invite-only Supabase login. Skipped in NSCS_TEST_MODE. */

function authRedirectUrl() {
  return window.location.origin + window.location.pathname;
}

function AuthGate(props) {
  var children = props.children;
  var _s = React.useState(null);
  var session = _s[0];
  var setSession = _s[1];
  var _l = React.useState(true);
  var loading = _l[0];
  var setLoading = _l[1];
  var _e = React.useState("");
  var email = _e[0];
  var setEmail = _e[1];
  var _p = React.useState("");
  var password = _p[0];
  var setPassword = _p[1];
  var _np = React.useState("");
  var newPassword = _np[0];
  var setNewPassword = _np[1];
  var _cp = React.useState("");
  var confirmPassword = _cp[0];
  var setConfirmPassword = _cp[1];
  var _mode = React.useState("login");
  var mode = _mode[0];
  var setMode = _mode[1];
  var _err = React.useState(null);
  var authError = _err[0];
  var setAuthError = _err[1];
  var _msg = React.useState(null);
  var authMessage = _msg[0];
  var setAuthMessage = _msg[1];
  var _busy = React.useState(false);
  var busy = _busy[0];
  var setBusy = _busy[1];

  var clearFeedback = function () {
    setAuthError(null);
    setAuthMessage(null);
  };

  var switchMode = function (next) {
    setMode(next);
    clearFeedback();
    setPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  React.useEffect(function () {
    var client = ensureSupabaseClient();
    if (NSCS_TEST_MODE || !client) {
      setSession({ user: { email: "test@local" } });
      setLoading(false);
      return;
    }
    client.auth.getSession().then(function (_ref) {
      var data = _ref.data;
      setSession(data.session);
      setLoading(false);
    });
    var sub = client.auth.onAuthStateChange(function (event, sess) {
      setSession(sess);
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset-password");
        clearFeedback();
      }
    });
    return function () {
      sub.data.subscription.unsubscribe();
    };
  }, []);

  var handleLogin = function (ev) {
    ev.preventDefault();
    var client = ensureSupabaseClient();
    if (!client) return;
    setBusy(true);
    clearFeedback();
    client.auth.signInWithPassword({ email: email.trim(), password: password })
      .then(function (res) {
        if (res.error) setAuthError(res.error.message);
        setBusy(false);
      })
      .catch(function (e) {
        setAuthError(e.message || "Login failed");
        setBusy(false);
      });
  };

  var handleMagicLink = function (ev) {
    ev.preventDefault();
    var client = ensureSupabaseClient();
    if (!client) return;
    setBusy(true);
    clearFeedback();
    client.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: authRedirectUrl() },
    })
      .then(function (res) {
        if (res.error) setAuthError(res.error.message);
        else setAuthMessage("Check your email for a sign-in link. It expires in about an hour.");
        setBusy(false);
      })
      .catch(function (e) {
        setAuthError(e.message || "Could not send magic link");
        setBusy(false);
      });
  };

  var handleForgotPassword = function (ev) {
    ev.preventDefault();
    var client = ensureSupabaseClient();
    if (!client) return;
    setBusy(true);
    clearFeedback();
    client.auth.resetPasswordForEmail(email.trim(), { redirectTo: authRedirectUrl() })
      .then(function (res) {
        if (res.error) setAuthError(res.error.message);
        else setAuthMessage("Check your email for a password reset link.");
        setBusy(false);
      })
      .catch(function (e) {
        setAuthError(e.message || "Could not send reset email");
        setBusy(false);
      });
  };

  var handleResetPassword = function (ev) {
    ev.preventDefault();
    var client = ensureSupabaseClient();
    if (!client) return;
    if (newPassword.length < 8) {
      setAuthError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setAuthError("Passwords do not match.");
      return;
    }
    setBusy(true);
    clearFeedback();
    client.auth.updateUser({ password: newPassword })
      .then(function (res) {
        if (res.error) setAuthError(res.error.message);
        else {
          setAuthMessage("Password updated. You are now signed in.");
          setMode("login");
          setNewPassword("");
          setConfirmPassword("");
        }
        setBusy(false);
      })
      .catch(function (e) {
        setAuthError(e.message || "Could not update password");
        setBusy(false);
      });
  };

  var handleSignOut = function () {
    var client = ensureSupabaseClient();
    if (client) client.auth.signOut();
  };

  var inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #dbe4f0",
    borderRadius: 3,
    padding: "9px 10px",
    marginBottom: 14,
    fontSize: 14,
  };

  var labelStyle = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#57667e",
    marginBottom: 4,
  };

  var linkBtnStyle = {
    background: "none",
    border: "none",
    color: "#0a53b0",
    cursor: "pointer",
    fontSize: 12,
    padding: 0,
    textDecoration: "underline",
  };

  var renderAuthLinks = function () {
    if (mode === "login") {
      return React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginTop: 14 } },
        React.createElement("button", { type: "button", style: linkBtnStyle, onClick: function () { switchMode("magic-link"); } }, "Sign in with magic link"),
        React.createElement("button", { type: "button", style: linkBtnStyle, onClick: function () { switchMode("forgot-password"); } }, "Forgot password?")
      );
    }
    if (mode === "magic-link" || mode === "forgot-password") {
      return React.createElement("div", { style: { marginTop: 14 } },
        React.createElement("button", { type: "button", style: linkBtnStyle, onClick: function () { switchMode("login"); } }, "Back to password sign in")
      );
    }
    return null;
  };

  var renderAuthForm = function () {
    if (mode === "reset-password") {
      return React.createElement("form", { onSubmit: handleResetPassword },
        React.createElement("p", { style: { fontSize: 13, color: "#57667e", margin: "0 0 20px" } }, "Choose a new password for your account."),
        React.createElement("label", { style: labelStyle }, "New password"),
        React.createElement("input", {
          type: "password", required: true, value: newPassword, autoComplete: "new-password",
          onChange: function (e) { setNewPassword(e.target.value); },
          style: inputStyle, minLength: 8,
        }),
        React.createElement("label", { style: labelStyle }, "Confirm password"),
        React.createElement("input", {
          type: "password", required: true, value: confirmPassword, autoComplete: "new-password",
          onChange: function (e) { setConfirmPassword(e.target.value); },
          style: inputStyle, minLength: 8,
        }),
        authError && React.createElement("div", { style: { color: "#bf4a3c", fontSize: 12, marginBottom: 12 } }, authError),
        authMessage && React.createElement("div", { style: { color: "#2a7a4b", fontSize: 12, marginBottom: 12 } }, authMessage),
        React.createElement("button", { type: "submit", disabled: busy, className: "ns-act", style: { width: "100%", opacity: busy ? 0.7 : 1 } }, busy ? "Updating…" : "Update password")
      );
    }

    if (mode === "magic-link") {
      return React.createElement("form", { onSubmit: handleMagicLink },
        React.createElement("p", { style: { fontSize: 13, color: "#57667e", margin: "0 0 20px" } }, "We'll email you a one-time sign-in link."),
        React.createElement("label", { style: labelStyle }, "Email"),
        React.createElement("input", {
          type: "email", required: true, value: email, autoComplete: "username",
          onChange: function (e) { setEmail(e.target.value); },
          style: inputStyle,
        }),
        authError && React.createElement("div", { style: { color: "#bf4a3c", fontSize: 12, marginBottom: 12 } }, authError),
        authMessage && React.createElement("div", { style: { color: "#2a7a4b", fontSize: 12, marginBottom: 12 } }, authMessage),
        React.createElement("button", { type: "submit", disabled: busy, className: "ns-act", style: { width: "100%", opacity: busy ? 0.7 : 1 } }, busy ? "Sending…" : "Send magic link"),
        renderAuthLinks()
      );
    }

    if (mode === "forgot-password") {
      return React.createElement("form", { onSubmit: handleForgotPassword },
        React.createElement("p", { style: { fontSize: 13, color: "#57667e", margin: "0 0 20px" } }, "Enter your email and we'll send a link to reset your password."),
        React.createElement("label", { style: labelStyle }, "Email"),
        React.createElement("input", {
          type: "email", required: true, value: email, autoComplete: "username",
          onChange: function (e) { setEmail(e.target.value); },
          style: inputStyle,
        }),
        authError && React.createElement("div", { style: { color: "#bf4a3c", fontSize: 12, marginBottom: 12 } }, authError),
        authMessage && React.createElement("div", { style: { color: "#2a7a4b", fontSize: 12, marginBottom: 12 } }, authMessage),
        React.createElement("button", { type: "submit", disabled: busy, className: "ns-act", style: { width: "100%", opacity: busy ? 0.7 : 1 } }, busy ? "Sending…" : "Send reset link"),
        renderAuthLinks()
      );
    }

    return React.createElement("form", { onSubmit: handleLogin },
      React.createElement("label", { style: labelStyle }, "Email"),
      React.createElement("input", {
        type: "email", required: true, value: email, autoComplete: "username",
        onChange: function (e) { setEmail(e.target.value); },
        style: inputStyle,
      }),
      React.createElement("label", { style: labelStyle }, "Password"),
      React.createElement("input", {
        type: "password", required: true, value: password, autoComplete: "current-password",
        onChange: function (e) { setPassword(e.target.value); },
        style: inputStyle,
      }),
      authError && React.createElement("div", { style: { color: "#bf4a3c", fontSize: 12, marginBottom: 12 } }, authError),
      authMessage && React.createElement("div", { style: { color: "#2a7a4b", fontSize: 12, marginBottom: 12 } }, authMessage),
      React.createElement("button", { type: "submit", disabled: busy, className: "ns-act", style: { width: "100%", opacity: busy ? 0.7 : 1 } }, busy ? "Signing in…" : "Sign in"),
      renderAuthLinks()
    );
  };

  var authTitles = {
    login: "Schedule Planner",
    "magic-link": "Magic link sign in",
    "forgot-password": "Reset password",
    "reset-password": "Set new password",
  };

  var authSubtitles = {
    login: "Sign in with your invited account.",
    "magic-link": "No password needed — we'll email you a link.",
    "forgot-password": "We'll send a link to choose a new password.",
    "reset-password": null,
  };

  if (loading) {
    return React.createElement("div", {
      className: "ns-app",
      style: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f8fd" },
    }, React.createElement("div", { style: { color: "#57667e", fontSize: 14 } }, "Loading…"));
  }

  if ((!session || mode === "reset-password") && !NSCS_TEST_MODE && ensureSupabaseClient()) {
    return React.createElement("div", {
      className: "ns-app",
      style: { minHeight: "100vh", background: "linear-gradient(135deg,#0a2440 0%,#0a3a74 55%,#0a53b0 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 },
    },
      React.createElement("div", {
        style: { background: "#fff", borderRadius: 6, padding: "36px 32px", width: "100%", maxWidth: 400, boxShadow: "0 8px 32px rgba(10,36,64,.25)" },
      },
        React.createElement("div", { className: "ns-eyebrow", style: { marginBottom: 8 } }, "North Star Classical Christian School"),
        React.createElement("h1", { className: "ns-disp", style: { fontSize: 22, fontWeight: 800, color: "#0a2440", margin: "0 0 6px" } }, authTitles[mode] || "Schedule Planner"),
        authSubtitles[mode] && React.createElement("p", { style: { fontSize: 13, color: "#57667e", margin: "0 0 24px" } }, authSubtitles[mode]),
        renderAuthForm(),
        mode !== "reset-password" && React.createElement("p", { style: { fontSize: 11, color: "#9aa8bc", marginTop: 20, marginBottom: 0 } }, "Access is by invitation only. Contact your administrator if you need an account.")
      )
    );
  }

  return React.createElement(React.Fragment, null,
    !NSCS_TEST_MODE && session && React.createElement("div", {
      style: { background: "#0a2440", color: "#b9c8de", fontSize: 11, padding: "6px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" },
    },
      React.createElement("span", null, "Signed in as ", React.createElement("strong", { style: { color: "#fff" } }, session.user && session.user.email)),
      React.createElement("button", {
        onClick: handleSignOut,
        style: { background: "transparent", border: "1px solid #57667e", color: "#fff", borderRadius: 3, padding: "3px 10px", cursor: "pointer", fontSize: 11 },
      }, "Sign out")
    ),
    children
  );
}

function Root() {
  return React.createElement(AuthGate, null, React.createElement(App, null));
}
