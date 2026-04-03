import List "mo:core/List";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";

module {
  public type UserRole = {
    #admin;
    #user;
    #guest;
  };

  public type AccessControlState = {
    var adminAssigned : Bool;
    userRoles : Map.Map<Principal, UserRole>;
  };

  private let admin_controllers : [Text] = [
    "atewe-etgil-mre73-twlmx-z2o2f-goui6-glmiq-qulqx-osud5-xdxsn-aqe",
    "gfd5w-iksaw-xr3aq-jij26-nwcfb-rvpze-rdxzq-sucdq-pm543-eg6jp-jqe",
  ];

  public func initState() : AccessControlState {
    {
      var adminAssigned = false;
      userRoles = Map.empty<Principal, UserRole>();
    };
  };

  // First principal that calls this function becomes admin, all other principals become users.
  public func initialize(state : AccessControlState, caller : Principal, adminToken : Text, userProvidedToken : Text) {
    if (caller.isAnonymous()) { return };
    switch (state.userRoles.get(caller)) {
      case (?_) {};
      case (null) {
        if (not state.adminAssigned and userProvidedToken == adminToken) {
          state.userRoles.add(caller, #admin);
          state.adminAssigned := true;
        } else {
          state.userRoles.add(caller, #user);
        };
      };
    };
  };

  public func getUserRole(state : AccessControlState, caller : Principal) : UserRole {
    if (caller.isAnonymous()) { return #guest };
    switch (state.userRoles.get(caller)) {
      case (?role) { role };
      case (null) {
        Runtime.trap("User is not registered");
      };
    };
  };

  public func assignRole(state : AccessControlState, caller : Principal, user : Principal, role : UserRole) {
    if (not (isAdmin(state, caller))) {
      Runtime.trap("Unauthorized: Only admins can assign user roles");
    };
    state.userRoles.add(user, role);
  };

  public func hasPermission(state : AccessControlState, caller : Principal, requiredRole : UserRole) : Bool {
    let userRole = getUserRole(state, caller);
    if (userRole == #admin or requiredRole == #guest) { true } else {
      userRole == requiredRole;
    };
  };

  public func isAdmin(state : AccessControlState, caller : Principal) : Bool {
    let callerPrincipalText = caller.toText();
    if (isAdminController(callerPrincipalText)) {
      return true;
    };
    getUserRole(state, caller) == #admin;
  };

  func trimText(text : Text) : Text {
    text.replace(#text(" "), "").replace(#text("\t"), "");
  };

  func isAdminController(callerPrincipalText : Text) : Bool {
    let trimmedCaller = trimText(callerPrincipalText);
    List.fromArray<Text>(admin_controllers).any(
      func(adminController : Text) : Bool {
        let trimmedAdmin = trimText(adminController);
        trimmedCaller == trimmedAdmin;
      },
    );
  };
};
