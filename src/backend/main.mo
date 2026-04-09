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

  type UserRole = { #admin; #user; #guest };

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

  // DocumentRecord without fileSize — matches the previously deployed stable type.
  // This variable receives the old stable data on upgrade.
  type DocumentRecord_V1 = {
    id : Text;
    ownerPrincipal : Principal;
    ownerName : Text;
    fileName : Text;
    filePath : Text;
    mimeType : Text;
    isPublic : Bool;
    uploadedAt : Int;
  };

  // Current DocumentRecord type includes fileSize.
  type DocumentRecord = {
    id : Text;
    ownerPrincipal : Principal;
    ownerName : Text;
    fileName : Text;
    filePath : Text;
    mimeType : Text;
    isPublic : Bool;
    uploadedAt : Int;
    fileSize : Nat;
  };

  // ---- State ----

  stable var userRoles : Map.Map<Principal, UserRole> = Map.empty<Principal, UserRole>();
  stable var userProfiles : Map.Map<Principal, UserProfile> = Map.empty<Principal, UserProfile>();
  stable var activeHoliday : Holiday = #none;

  stable var contactMessages : Map.Map<Text, ContactMessage> = Map.empty<Text, ContactMessage>();
  stable var blockedSenders : Map.Map<Text, Bool> = Map.empty<Text, Bool>();
  stable var contactIdCounter : Nat = 0;

  // documentRecords: stable var that stores the OLD type (DocumentRecord_V1) so that
  // the upgrade compatibility check passes. It receives the previously-deployed data.
  // In postupgrade we copy+migrate all entries into documentRecords_v2 and clear this map.
  stable var documentRecords : Map.Map<Text, DocumentRecord_V1> = Map.empty<Text, DocumentRecord_V1>();
  // documentRecords_v2: the live store used by all document APIs (new type with fileSize).
  stable var documentRecords_v2 : Map.Map<Text, DocumentRecord> = Map.empty<Text, DocumentRecord>();
  stable var documentIdCounter : Nat = 0;
  stable var allowGuestDocumentUpload : Bool = false;

  // ---- Migration ----

  system func postupgrade() {
    // Migrate V1 records (no fileSize) into documentRecords_v2 with fileSize = 0
    for ((id, old) in documentRecords.entries()) {
      switch (documentRecords_v2.get(id)) {
        case (null) {
          documentRecords_v2.add(id, {
            id = old.id;
            ownerPrincipal = old.ownerPrincipal;
            ownerName = old.ownerName;
            fileName = old.fileName;
            filePath = old.filePath;
            mimeType = old.mimeType;
            isPublic = old.isPublic;
            uploadedAt = old.uploadedAt;
            fileSize = 0;
          });
        };
        case (?_) {}; // already migrated
      };
    };
    // Clear the v1 store after migration
    for ((id, _) in documentRecords.entries()) {
      documentRecords.remove(id);
    };
  };

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
    switch (userRoles.get(caller)) {
      case (?#admin) { true };
      case (_) { false };
    };
  };

  // Safe role lookup: never traps. Returns #guest for unknown principals.
  func getCallerRole(caller : Principal) : UserRole {
    if (caller.isAnonymous()) { return #guest };
    switch (userRoles.get(caller)) {
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

  // Sanitize a file name: replace spaces and special chars with underscores,
  // keep alphanumeric, dots, and hyphens.
  func sanitizeFileName(name : Text) : Text {
    Text.fromIter(
      name.toIter().map(func(c : Char) : Char {
        if (c.isAlphabetic() or c.isDigit() or c == '.' or c == '-') {
          c
        } else {
          '_'
        }
      })
    );
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
    switch (userRoles.get(p)) {
      case (?_) { userRoles.add(p, #guest) };
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
          switch (userRoles.get(caller)) {
            case (null) { userRoles.add(caller, #admin) };
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
        // Guests can always upsert their own profile
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
            // Register the new user in userRoles as #guest (first-login default)
            userRoles.add(caller, #guest);
          };
        };
        return #ok;
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
            switch (userRoles.get(caller)) {
              case (null) { userRoles.add(caller, #user) };
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

    for ((p, _) in userRoles.entries()) {
      allPrincipals.add(p, true);
    };
    for ((p, _) in userProfiles.entries()) {
      allPrincipals.add(p, true);
    };

    let entries = allPrincipals.entries().toArray().map(
      func(pair : (Principal, Bool)) : UserListEntry {
        let p = pair.0;
        let role = switch (userRoles.get(p)) {
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
    switch (userRoles.get(p)) {
      case (?_) { return #err("User already exists.") };
      case (null) {
        userRoles.add(p, role);
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
    userRoles.add(p, newRole);
    return #ok;
  };

  public shared ({ caller }) func removeUser(principalText : Text) : async { #ok; #err : Text } {
    if (not isAdmin(caller)) {
      return #err("Unauthorized: Only admins can remove users.");
    };
    let p = Principal.fromText(principalText);
    userRoles.remove(p);
    userProfiles.remove(p);
    return #ok;
  };

  public shared ({ caller }) func blockUser(principalText : Text) : async { #ok; #err : Text } {
    if (not isAdmin(caller)) {
      return #err("Unauthorized: Only admins can block users.");
    };
    let p = Principal.fromText(principalText);
    userRoles.add(p, #guest);
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

  // ---- Document APIs ----

  // uploadDocument: stores metadata for a document already uploaded via object-storage.
  // The filePath must use the format: documents/public/{ownerName}/{fileName}
  // Caller must be #user or #admin, or #guest only when allowGuestDocumentUpload is true.
  // fileSize is in bytes; total storage per user is capped at 100MB (104857600 bytes).
  public shared ({ caller }) func uploadDocument(fileName : Text, filePath : Text, mimeType : Text, isPublic : Bool, fileSize : Nat) : async { #ok : Text; #err : Text } {
    if (caller.isAnonymous()) {
      return #err("Unauthorized: You must be logged in to upload documents.");
    };
    let role = getCallerRole(caller);
    switch (role) {
      case (#guest) {
        if (not allowGuestDocumentUpload) {
          return #err("Unauthorized: Guests cannot upload documents.");
        };
      };
      case (_) {};
    };

    // Enforce 100MB total storage limit per user
    let maxStorage : Nat = 104857600;
    let usedStorage = documentRecords_v2.entries().toArray()
      .filter(func(pair : (Text, DocumentRecord)) : Bool {
        Principal.equal(pair.1.ownerPrincipal, caller)
      })
      .foldLeft(0 : Nat, func(acc : Nat, pair : (Text, DocumentRecord)) : Nat {
        acc + pair.1.fileSize
      });
    if (usedStorage + fileSize > maxStorage) {
      return #err("Storage limit exceeded. Maximum total storage per user is 100MB.");
    };

    let safeFileName = sanitizeFileName(fileName);
    if (textLength(safeFileName) == 0) {
      return #err("File name is required.");
    };

    // Resolve owner name from profile, fallback to sanitized principal text
    let ownerName = switch (userProfiles.get(caller)) {
      case (?profile) {
        if (textLength(profile.name) > 0) { profile.name } else { caller.toText() }
      };
      case (null) { caller.toText() };
    };

    documentIdCounter += 1;
    let id = "doc-" # documentIdCounter.toText() # "-" # Time.now().toText();

    let doc : DocumentRecord = {
      id = id;
      ownerPrincipal = caller;
      ownerName = ownerName;
      fileName = safeFileName;
      filePath = filePath;
      mimeType = mimeType;
      isPublic = isPublic;
      uploadedAt = Time.now();
      fileSize = fileSize;
    };

    documentRecords_v2.add(id, doc);
    return #ok(id);
  };

  // listMyDocuments: returns all documents owned by the caller.
  public query ({ caller }) func listMyDocuments() : async [DocumentRecord] {
    if (caller.isAnonymous()) { return [] };
    documentRecords_v2.entries().toArray()
      .filter(func(pair : (Text, DocumentRecord)) : Bool {
        Principal.equal(pair.1.ownerPrincipal, caller)
      })
      .map(func(pair : (Text, DocumentRecord)) : DocumentRecord { pair.1 });
  };

  // setDocumentPublic: toggles the isPublic flag for the caller's own document.
  public shared ({ caller }) func setDocumentPublic(documentId : Text, isPublic : Bool) : async { #ok; #err : Text } {
    if (caller.isAnonymous()) {
      return #err("Unauthorized: You must be logged in.");
    };
    switch (documentRecords_v2.get(documentId)) {
      case (null) { return #err("Document not found.") };
      case (?doc) {
        if (not Principal.equal(doc.ownerPrincipal, caller) and not isAdmin(caller)) {
          return #err("Unauthorized: You can only update your own documents.");
        };
        documentRecords_v2.add(documentId, { doc with isPublic = isPublic });
        return #ok;
      };
    };
  };

  // deleteDocument: removes document metadata; caller must own the document (or be admin).
  public shared ({ caller }) func deleteDocument(documentId : Text) : async { #ok; #err : Text } {
    if (caller.isAnonymous()) {
      return #err("Unauthorized: You must be logged in.");
    };
    switch (documentRecords_v2.get(documentId)) {
      case (null) { return #err("Document not found.") };
      case (?doc) {
        if (not Principal.equal(doc.ownerPrincipal, caller) and not isAdmin(caller)) {
          return #err("Unauthorized: You can only delete your own documents.");
        };
        documentRecords_v2.remove(documentId);
        return #ok;
      };
    };
  };

  // listPublicDocuments: returns all documents marked as public. No auth required.
  public query func listPublicDocuments() : async [DocumentRecord] {
    documentRecords_v2.entries().toArray()
      .filter(func(pair : (Text, DocumentRecord)) : Bool { pair.1.isPublic })
      .map(func(pair : (Text, DocumentRecord)) : DocumentRecord { pair.1 });
  };

  // getMyStorageUsed: returns total bytes used by the caller across all their documents.
  public query ({ caller }) func getMyStorageUsed() : async Nat {
    if (caller.isAnonymous()) { return 0 };
    documentRecords_v2.entries().toArray()
      .filter(func(pair : (Text, DocumentRecord)) : Bool {
        Principal.equal(pair.1.ownerPrincipal, caller)
      })
      .foldLeft(0 : Nat, func(acc : Nat, pair : (Text, DocumentRecord)) : Nat {
        acc + pair.1.fileSize
      });
  };

  // setGuestDocumentUploadPermission: admin-only toggle for guest upload access.
  public shared ({ caller }) func setGuestDocumentUploadPermission(allowed : Bool) : async { #ok; #err : Text } {
    if (not isAdmin(caller)) {
      return #err("Unauthorized: Only admins can change guest document upload permission.");
    };
    allowGuestDocumentUpload := allowed;
    return #ok;
  };

  // getGuestDocumentUploadPermission: returns whether guests are allowed to upload documents.
  public query func getGuestDocumentUploadPermission() : async Bool {
    allowGuestDocumentUpload;
  };

  // --> Admin operations, USED ONLY WITH CANDID UI, DO NOT USE admin_* operations in front-end

  public shared ({ caller }) func admin_addUserAccess(
    userPrincipalText : Text,
    role : UserRole,
  ) : async () {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins can add user access.");
    };
    let p = Principal.fromText(userPrincipalText);
    switch (userRoles.get(p)) {
      case (?_) { Runtime.trap("User already has an access entry") };
      case (null) {
        userRoles.add(p, role);
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
    newRole : UserRole,
  ) : async () {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins can update user access.");
    };
    let p = Principal.fromText(userPrincipalText);
    switch (userRoles.get(p)) {
      case (null) { Runtime.trap("User has no access entry to update") };
      case (?_) {
        userRoles.add(p, newRole);
      };
    };
  };

  public query ({ caller }) func admin_getUserAccess() : async [UserAccessEntry] {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins can list user access.");
    };
    userRoles.entries().toArray().map(
      func(pair : (Principal, UserRole)) : UserAccessEntry {
        { principal = pair.0; role = pair.1 };
      },
    );
  };

};
