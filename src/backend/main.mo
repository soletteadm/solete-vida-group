import AccessControl "./authorization/access-control";
import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Nat "mo:core/Nat";
import Int "mo:core/Int";

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

  type Holiday = {
    #none;
    #easter;
    #christmas;
    #newyear;
    #midsommar;
  };

  type ContactStatus = {
    #active;
    #notactive;
  };

  type ContactMessage = {
    id : Text;
    name : Text;
    email : Text;
    message : Text;
    submittedAt : Int;
    status : ContactStatus;
    senderPrincipal : ?Text;
    deviceId : ?Text;
    senderBlocked : Bool;
  };

  // ---- State ----

  var accessControlState : AccessControl.AccessControlState = AccessControl.initState();
  var userProfiles : Map.Map<Principal, UserProfile> = Map.empty<Principal, UserProfile>();
  var activeHoliday : Holiday = #none;

  var contactMessages : Map.Map<Text, ContactMessage> = Map.empty<Text, ContactMessage>();
  var blockedSenders : Map.Map<Text, Bool> = Map.empty<Text, Bool>();
  var contactIdCounter : Nat = 0;

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
    switch (accessControlState.userRoles.get(caller)) {
      case (?#admin) { true };
      case (_) { false };
    };
  };

  // Safe role lookup: never traps. Returns #guest for unknown principals.
  func getCallerRole(caller : Principal) : UserRole {
    if (caller.isAnonymous()) { return #guest };
    switch (accessControlState.userRoles.get(caller)) {
      case (?role) { role };
      case (null) { #guest };
    };
  };

  func requireAdmin(caller : Principal) {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins can perform this action.");
    };
  };

  // Simple HTML/script tag sanitization -- removes <script>, <iframe>, and HTML tags
  func sanitizeText(input : Text) : Text {
    // Replace < and > to neutralize any HTML/script injection
    let step1 = input.replace(#text("<"), "&lt;");
    let step2 = step1.replace(#text(">"), "&gt;");
    step2;
  };

  func textLength(t : Text) : Nat {
    var count : Nat = 0;
    for (_ in t.chars()) { count += 1 };
    count;
  };

  // ---- Holiday APIs ----

  public query func getActiveHoliday() : async Holiday {
    activeHoliday;
  };

  public shared ({ caller }) func setActiveHoliday(holiday : Holiday) : async { #ok; #err : Text } {
    if (not isAdmin(caller)) {
      return #err("Unauthorized: Only admins can set holidays.");
    };
    activeHoliday := holiday;
    return #ok;
  };

  // ---- Contact Form APIs ----

  public shared ({ caller }) func submitContact(name : Text, email : Text, message : Text) : async { #ok : Text; #err : Text } {
    // Check if sender is blocked
    let callerText = caller.toText();
    if (not caller.isAnonymous()) {
      switch (blockedSenders.get(callerText)) {
        case (?true) { return #err("You are blocked from submitting contact messages.") };
        case (_) {};
      };
    };

    // Validate inputs
    let trimmedName = name.trim(#text(" "));
    let trimmedEmail = email.trim(#text(" "));
    let trimmedMessage = message.trim(#text(" "));

    if (textLength(trimmedName) == 0) {
      return #err("Name is required.");
    };
    if (textLength(trimmedName) > 100) {
      return #err("Name must be 100 characters or less.");
    };
    if (textLength(trimmedEmail) == 0) {
      return #err("Email is required.");
    };
    if (textLength(trimmedEmail) > 200) {
      return #err("Email must be 200 characters or less.");
    };
    if (textLength(trimmedMessage) == 0) {
      return #err("Message is required.");
    };
    if (textLength(trimmedMessage) > 500) {
      return #err("Message must be 500 characters or less.");
    };

    // Sanitize inputs
    let safeName = sanitizeText(trimmedName);
    let safeEmail = sanitizeText(trimmedEmail);
    let safeMessage = sanitizeText(trimmedMessage);

    // Generate ID
    contactIdCounter += 1;
    let id = "msg-" # contactIdCounter.toText() # "-" # Time.now().toText();

    let senderPrincipal : ?Text = if (caller.isAnonymous()) { null } else { ?callerText };

    let msg : ContactMessage = {
      id = id;
      name = safeName;
      email = safeEmail;
      message = safeMessage;
      submittedAt = Time.now();
      status = #active;
      senderPrincipal = senderPrincipal;
      deviceId = null;
      senderBlocked = false;
    };

    contactMessages.add(id, msg);
    return #ok(id);
  };

  public shared ({ caller }) func listContactMessages() : async { #ok : [ContactMessage]; #err : Text } {
    if (not isAdmin(caller)) {
      return #err("Unauthorized: Only admins can list contact messages.");
    };
    let msgs = contactMessages.entries().toArray().map(
      func(pair : (Text, ContactMessage)) : ContactMessage {
        let msg = pair.1;
        // Reflect current blocked status
        let isBlocked = switch (msg.senderPrincipal) {
          case (?p) {
            switch (blockedSenders.get(p)) {
              case (?true) { true };
              case (_) { false };
            };
          };
          case (null) { false };
        };
        { msg with senderBlocked = isBlocked };
      }
    );
    return #ok(msgs);
  };

  public shared ({ caller }) func updateContactStatus(id : Text, status : ContactStatus) : async { #ok; #err : Text } {
    if (not isAdmin(caller)) {
      return #err("Unauthorized: Only admins can update contact status.");
    };
    switch (contactMessages.get(id)) {
      case (null) { return #err("Message not found.") };
      case (?msg) {
        contactMessages.add(id, { msg with status = status });
        return #ok;
      };
    };
  };

  public shared ({ caller }) func deleteContactMessage(id : Text) : async { #ok; #err : Text } {
    if (not isAdmin(caller)) {
      return #err("Unauthorized: Only admins can delete contact messages.");
    };
    contactMessages.remove(id);
    return #ok;
  };

  public shared ({ caller }) func deleteContactMessages(ids : [Text]) : async { #ok; #err : Text } {
    if (not isAdmin(caller)) {
      return #err("Unauthorized: Only admins can delete contact messages.");
    };
    for (id in ids.vals()) {
      contactMessages.remove(id);
    };
    return #ok;
  };

  public shared ({ caller }) func blockContactSender(principalText : Text) : async { #ok; #err : Text } {
    if (not isAdmin(caller)) {
      return #err("Unauthorized: Only admins can block senders.");
    };
    blockedSenders.add(principalText, true);
    // Also demote to guest in userRoles if they exist
    let p = Principal.fromText(principalText);
    switch (accessControlState.userRoles.get(p)) {
      case (?_) { accessControlState.userRoles.add(p, #guest) };
      case (null) {};
    };
    return #ok;
  };

  public shared ({ caller }) func unblockContactSender(principalText : Text) : async { #ok; #err : Text } {
    if (not isAdmin(caller)) {
      return #err("Unauthorized: Only admins can unblock senders.");
    };
    blockedSenders.remove(principalText);
    return #ok;
  };

  public shared ({ caller }) func getBlockedSenders() : async { #ok : [Text]; #err : Text } {
    if (not isAdmin(caller)) {
      return #err("Unauthorized: Only admins can view blocked senders.");
    };
    let blocked = blockedSenders.entries().toArray().map(
      func(pair : (Text, Bool)) : Text { pair.0 }
    );
    return #ok(blocked);
  };

  // ---- Public APIs (for frontend) ----

  public query ({ caller }) func getMyRole() : async UserRole {
    getCallerRole(caller);
  };

  public query ({ caller }) func getMyProfile() : async ?UserProfile {
    userProfiles.get(caller);
  };

  // updateMyProfile: upsert behaviour -- always create if not exists, update if exists.
  // Admin principals are always allowed. Guest principals can create but not update.
  // When a new profile is created, the caller is registered in userRoles as #guest
  // (first-login default) so they appear in listUsers.
  public shared ({ caller }) func updateMyProfile(name : Text, email : Text, phone : Text) : async { #ok; #err : Text } {
    // Admins: always allow upsert
    if (isAdmin(caller)) {
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
          // Register admin in userRoles if not already there
          switch (accessControlState.userRoles.get(caller)) {
            case (null) { accessControlState.userRoles.add(caller, #admin) };
            case (?_) {};
          };
        };
      };
      return #ok;
    };

    // Use safe role lookup (never traps -- unknown users treated as guests)
    let role = getCallerRole(caller);
    switch (role) {
      case (#guest) {
        // Guests can create a profile but cannot update an existing one
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
            // Register the new user in userRoles as #guest (first-login default)
            accessControlState.userRoles.add(caller, #guest);
            return #ok;
          };
        };
      };
      case (_) {
        // #user or #admin: upsert
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
            // Ensure they are in userRoles
            switch (accessControlState.userRoles.get(caller)) {
              case (null) { accessControlState.userRoles.add(caller, #user) };
              case (?_) {};
            };
          };
        };
        return #ok;
      };
    };
  };

  // listUsers: returns ALL known users -- those in userRoles AND those who only
  // have a profile (self-registered via updateMyProfile). Backend is the single
  // source of truth; no user data is stored in the frontend.
  public shared ({ caller }) func listUsers() : async { #ok : [UserListEntry]; #err : Text } {
    if (not isAdmin(caller)) {
      return #err("Unauthorized: Only admins can list users.");
    };

    // Collect all principals from both maps (deduped via a temporary map)
    var allPrincipals : Map.Map<Principal, Bool> = Map.empty<Principal, Bool>();

    for ((p, _) in accessControlState.userRoles.entries()) {
      allPrincipals.add(p, true);
    };
    for ((p, _) in userProfiles.entries()) {
      allPrincipals.add(p, true);
    };

    let entries = allPrincipals.entries().toArray().map(
      func(pair : (Principal, Bool)) : UserListEntry {
        let p = pair.0;
        let role = switch (accessControlState.userRoles.get(p)) {
          case (?r) { r };
          case (null) { #guest }; // has a profile but no explicit role -> treat as guest
        };
        {
          principal = p;
          role = role;
          profile = userProfiles.get(p);
        };
      },
    );
    return #ok(entries);
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
    // Allow role update even if user is only in userProfiles (not yet in userRoles)
    accessControlState.userRoles.add(p, newRole);
    return #ok;
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
    accessControlState.userRoles.add(p, #guest);
    return #ok;
  };


  public shared ({ caller }) func updateUserProfile(principalText : Text, name : Text, email : Text, phone : Text) : async { #ok; #err : Text } {
    if (not isAdmin(caller)) {
      return #err("Unauthorized: Only admins can update user profiles.");
    };
    let p = Principal.fromText(principalText);
    switch (userProfiles.get(p)) {
      case (?existing) {
        userProfiles.add(p, {
          name = name;
          email = email;
          phone = phone;
          registeredAt = existing.registeredAt;
        });
      };
      case (null) {
        userProfiles.add(p, {
          name = name;
          email = email;
          phone = phone;
          registeredAt = Time.now();
        });
      };
    };
    return #ok;
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
