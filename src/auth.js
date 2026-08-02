/* Auth gate — invite-only Supabase login. Skipped in NSCS_TEST_MODE. */

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
  var _err = React.useState(null);
  var authError = _err[0];
  var setAuthError = _err[1];
  var _busy = React.useState(false);
  var busy = _busy[0];
  var setBusy = _busy[1];

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
    var sub = client.auth.onAuthStateChange(function (_event, sess) {
      setSession(sess);
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
    setAuthError(null);
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

  var handleSignOut = function () {
    var client = ensureSupabaseClient();
    if (client) client.auth.signOut();
  };

  if (loading) {
    return React.createElement("div", {
      className: "ns-app",
      style: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f8fd" },
    }, React.createElement("div", { style: { color: "#57667e", fontSize: 14 } }, "Loading…"));
  }

  if (!session && !NSCS_TEST_MODE && ensureSupabaseClient()) {
    return React.createElement("div", {
      className: "ns-app",
      style: { minHeight: "100vh", background: "linear-gradient(135deg,#0a2440 0%,#0a3a74 55%,#0a53b0 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 },
    },
      React.createElement("div", {
        style: { background: "#fff", borderRadius: 6, padding: "36px 32px", width: "100%", maxWidth: 400, boxShadow: "0 8px 32px rgba(10,36,64,.25)" },
      },
        React.createElement("div", { className: "ns-eyebrow", style: { marginBottom: 8 } }, "North Star Classical Christian School"),
        React.createElement("h1", { className: "ns-disp", style: { fontSize: 22, fontWeight: 800, color: "#0a2440", margin: "0 0 6px" } }, "Schedule Planner"),
        React.createElement("p", { style: { fontSize: 13, color: "#57667e", margin: "0 0 24px" } }, "Sign in with your invited account."),
        React.createElement("form", { onSubmit: handleLogin },
          React.createElement("label", { style: { display: "block", fontSize: 12, fontWeight: 600, color: "#57667e", marginBottom: 4 } }, "Email"),
          React.createElement("input", {
            type: "email", required: true, value: email, autoComplete: "username",
            onChange: function (e) { setEmail(e.target.value); },
            style: { width: "100%", boxSizing: "border-box", border: "1px solid #dbe4f0", borderRadius: 3, padding: "9px 10px", marginBottom: 14, fontSize: 14 },
          }),
          React.createElement("label", { style: { display: "block", fontSize: 12, fontWeight: 600, color: "#57667e", marginBottom: 4 } }, "Password"),
          React.createElement("input", {
            type: "password", required: true, value: password, autoComplete: "current-password",
            onChange: function (e) { setPassword(e.target.value); },
            style: { width: "100%", boxSizing: "border-box", border: "1px solid #dbe4f0", borderRadius: 3, padding: "9px 10px", marginBottom: 14, fontSize: 14 },
          }),
          authError && React.createElement("div", { style: { color: "#bf4a3c", fontSize: 12, marginBottom: 12 } }, authError),
          React.createElement("button", { type: "submit", disabled: busy, className: "ns-act", style: { width: "100%", opacity: busy ? 0.7 : 1 } }, busy ? "Signing in…" : "Sign in")
        ),
        React.createElement("p", { style: { fontSize: 11, color: "#9aa8bc", marginTop: 20, marginBottom: 0 } }, "Access is by invitation only. Contact your administrator if you need an account.")
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
