import AccessControl "./authorization/access-control";
import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";

actor {

  // ---- Types ----

  type UserRole = AccessControl.UserRole;

  type UserProfile = {
    name : Text;
    email : Text;
    phone : Text;
    registeredAt : Int;
  };

  type UserAccessEntry = {
    principal : Principal;
    role : UserRole;
  };

  type UserListEntry = {
    principal : Principal;
    role : UserRole;
    profile : ?UserProfile;
  };

  // ---- State ----

  var accessControlState : AccessControl.AccessControlState = AccessControl.initState();
  var userProfiles : Map.Map<Principal, UserProfile> = Map.empty<Principal, UserProfile>();

  // ---- Local admin logic (independent of AccessControl.isAdmin) ----

  private let admin_controllers : [Text] = [
    "atewe-etgil-mre73-twlmx-z2o2f-goui6-glmiq-qulqx-osud5-xdxsn-aqe",
    "gfd5w-iksaw-xr3aq-jij26-nwcfb-rvpze-rdxzq-sucdq-pm543-eg6jp-jqe",
    "4vcqd-odjhq-5ufar-22ohg-mkxwk-gclrs-sdxvy-wfela-a6nax-xi3ol-bae",
    "wr56f-togr5-jngaa-pssu5-64x54-cglpb-47kpa-swrr4-wayex-nfunu-xae",
  ];

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

  func isAdmin(caller : Principal) : Bool {
    let callerPrincipalText = caller.toText();
    if (isAdminController(callerPrincipalText)) {
      return true;
    };
    AccessControl.getUserRole(accessControlState, caller) == #admin;
  };

  func requireAdmin(caller : Principal) {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins can perform this action.");
    };
  };

  // ---- Public APIs (for frontend) ----

  public query ({ caller }) func getMyRole() : async UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public query ({ caller }) func getMyProfile() : async ?UserProfile {
    userProfiles.get(caller);
  };

  public shared ({ caller }) func updateMyProfile(name : Text, email : Text, phone : Text) : async { #ok; #err : Text } {
    let role = AccessControl.getUserRole(accessControlState, caller);
    switch (role) {
      case (#guest) {
        switch (userProfiles.get(caller)) {
          case (?_) {
            return #err("Guests cannot update an existing profile.");
          };
          case (null) {
            userProfiles.add(caller, {
              name = name;
              email = email;
              phone = phone;
              registeredAt = Time.now();
            });
            return #ok;
          };
        };
      };
      case (_) {
        switch (userProfiles.get(caller)) {
          case (?existing) {
            userProfiles.add(caller, {
              name = name;
              email = email;
              phone = phone;
              registeredAt = existing.registeredAt;
            });
          };
          case (null) {
            userProfiles.add(caller, {
              name = name;
              email = email;
              phone = phone;
              registeredAt = Time.now();
            });
          };
        };
        return #ok;
      };
    };
  };

  public query ({ caller }) func listUsers() : async [UserListEntry] {
    requireAdmin(caller);
    accessControlState.userRoles.entries().toArray().map(
      func(pair : (Principal, UserRole)) : UserListEntry {
        {
          principal = pair.0;
          role = pair.1;
          profile = userProfiles.get(pair.0);
        };
      },
    );
  };

  public shared ({ caller }) func addUser(principalText : Text, role : UserRole) : async { #ok; #err : Text } {
    if (not isAdmin(caller)) {
      return #err("Unauthorized: Only admins can add users.");
    };
    let p = Principal.fromText(principalText);
    switch (accessControlState.userRoles.get(p)) {
      case (?_) { return #err("User already exists.") };
      case (null) {
        accessControlState.userRoles.add(p, role);
        switch (userProfiles.get(p)) {
          case (null) {
            userProfiles.add(p, {
              name = "";
              email = "";
              phone = "";
              registeredAt = Time.now();
            });
          };
          case (?_) {};
        };
        return #ok;
      };
    };
  };

  public shared ({ caller }) func updateUserRole(principalText : Text, newRole : UserRole) : async { #ok; #err : Text } {
    if (not isAdmin(caller)) {
      return #err("Unauthorized: Only admins can update user roles.");
    };
    let p = Principal.fromText(principalText);
    switch (accessControlState.userRoles.get(p)) {
      case (null) { return #err("User not found.") };
      case (?_) {
        accessControlState.userRoles.add(p, newRole);
        return #ok;
      };
    };
  };

  public shared ({ caller }) func removeUser(principalText : Text) : async { #ok; #err : Text } {
    if (not isAdmin(caller)) {
      return #err("Unauthorized: Only admins can remove users.");
    };
    let p = Principal.fromText(principalText);
    accessControlState.userRoles.remove(p);
    userProfiles.remove(p);
    return #ok;
  };

  public shared ({ caller }) func blockUser(principalText : Text) : async { #ok; #err : Text } {
    if (not isAdmin(caller)) {
      return #err("Unauthorized: Only admins can block users.");
    };
    let p = Principal.fromText(principalText);
    switch (accessControlState.userRoles.get(p)) {
      case (null) { return #err("User not found.") };
      case (?_) {
        accessControlState.userRoles.add(p, #guest);
        return #ok;
      };
    };
  };

  // --> Admin operations, USED ONLY WITH CANDID UI, DO NOT USE admin_* operations in front-end

  public shared ({ caller }) func admin_addUserAccess(
    userPrincipalText : Text,
    role : AccessControl.UserRole,
  ) : async () {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins can add user access.");
    };
    let p = Principal.fromText(userPrincipalText);
    switch (accessControlState.userRoles.get(p)) {
      case (?_) { Runtime.trap("User already has an access entry") };
      case (null) {
        accessControlState.userRoles.add(p, role);
        switch (userProfiles.get(p)) {
          case (null) {
            userProfiles.add(p, {
              name = "";
              email = "";
              phone = "";
              registeredAt = Time.now();
            });
          };
          case (?_) {};
        };
      };
    };
  };

  public shared ({ caller }) func admin_updateUserAccess(
    userPrincipalText : Text,
    newRole : AccessControl.UserRole,
  ) : async () {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins can update user access.");
    };
    let p = Principal.fromText(userPrincipalText);
    switch (accessControlState.userRoles.get(p)) {
      case (null) { Runtime.trap("User has no access entry to update") };
      case (?_) {
        accessControlState.userRoles.add(p, newRole);
      };
    };
  };

  public query ({ caller }) func admin_getUserAccess() : async [UserAccessEntry] {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins can list user access.");
    };
    accessControlState.userRoles.entries().toArray().map(
      func(pair : (Principal, UserRole)) : UserAccessEntry {
        { principal = pair.0; role = pair.1 };
      },
    );
  };

};
