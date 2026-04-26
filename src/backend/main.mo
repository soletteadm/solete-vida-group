import Array "mo:core/Array";
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

  // DocumentRecord v2 — has fileSize but no parentFolderId.
  // Kept for migration purposes only.
  type DocumentRecord_V2 = {
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

  // Current DocumentRecord type — includes fileSize and parentFolderId.
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
    parentFolderId : ?Text;
  };

  // FolderRecord type for folder management.
  type FolderRecord = {
    id : Text;
    ownerPrincipal : Principal;
    ownerName : Text;
    name : Text;
    parentFolderId : ?Text;
    createdAt : Int;
  };

  // UserAccessLogEntry: records a single login/access event for a user.
  type UserAccessLogEntry = {
    id : Text;
    timestamp : Int;
    metadata : Text; // optional info like IP/user-agent, can be ""
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
  // documentRecords_v2: receives V1→V2 migrated data; also migrated to v3 on upgrade.
  stable var documentRecords_v2 : Map.Map<Text, DocumentRecord_V2> = Map.empty<Text, DocumentRecord_V2>();
  // documentRecords_v3: live store — includes parentFolderId.
  stable var documentRecords_v3 : Map.Map<Text, DocumentRecord> = Map.empty<Text, DocumentRecord>();
  stable var documentIdCounter : Nat = 0;
  stable var allowGuestDocumentUpload : Bool = false;

  // fileBlobs: raw file bytes stored by docId. Key = docId (same as DocumentRecord.id).
  stable var fileBlobs : Map.Map<Text, [Nat8]> = Map.empty<Text, [Nat8]>();

  // ChunkedUploadMeta: metadata for an in-progress chunked upload session.
  type ChunkedUploadMeta = {
    fileName : Text;
    mimeType : Text;
    isPublic : Bool;
    parentFolderId : ?Text;
    totalChunks : Nat;
    totalFileSize : Nat;
    ownerPrincipal : Principal;
    ownerName : Text;
  };

  // pendingChunks: temporary storage for incoming file chunks.
  // Outer key = sessionId, inner key = chunk index, value = chunk bytes.
  stable var pendingChunks : Map.Map<Text, Map.Map<Nat, [Nat8]>> = Map.empty<Text, Map.Map<Nat, [Nat8]>>();

  // pendingChunkMeta: metadata for in-progress chunked uploads, keyed by sessionId.
  stable var pendingChunkMeta : Map.Map<Text, ChunkedUploadMeta> = Map.empty<Text, ChunkedUploadMeta>();

  // Folder storage
  stable var folderRecords : Map.Map<Text, FolderRecord> = Map.empty<Text, FolderRecord>();
  stable var folderIdCounter : Nat = 1;

  // userAccessLogs: stores access log entries per principal (max 50 per user).
  stable var userAccessLogs : Map.Map<Principal, [UserAccessLogEntry]> = Map.empty<Principal, [UserAccessLogEntry]>();

  // NoteRecord: a user note with optional sharing.
  type NoteRecord = {
    id : Text;
    owner : Principal;
    rubrik : Text;
    content : Text;
    createdAt : Int;
    sharedWith : [Principal];
  };

  // noteRecords: stores all notes keyed by note ID.
  stable var noteRecords : Map.Map<Text, NoteRecord> = Map.empty<Text, NoteRecord>();
  stable var noteIdCounter : Nat = 0;

  // ---- Migration ----

  system func postupgrade() {
    // Step 1: Migrate V1 records (no fileSize) into documentRecords_v2 with fileSize = 0
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

    // Step 2: Migrate V2 records (no parentFolderId) into documentRecords_v3 with parentFolderId = null
    for ((id, old) in documentRecords_v2.entries()) {
      switch (documentRecords_v3.get(id)) {
        case (null) {
          documentRecords_v3.add(id, {
            id = old.id;
            ownerPrincipal = old.ownerPrincipal;
            ownerName = old.ownerName;
            fileName = old.fileName;
            filePath = old.filePath;
            mimeType = old.mimeType;
            isPublic = old.isPublic;
            uploadedAt = old.uploadedAt;
            fileSize = old.fileSize;
            parentFolderId = null;
          });
        };
        case (?_) {}; // already migrated
      };
    };
    // Clear the v2 store after migration
    for ((id, _) in documentRecords_v2.entries()) {
      documentRecords_v2.remove(id);
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
    let usedStorage = documentRecords_v3.entries().toArray()
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
      parentFolderId = null;
    };

    documentRecords_v3.add(id, doc);
    return #ok(id);
  };

  // listMyDocuments: returns documents owned by the caller, optionally filtered by folder.
  // parentFolderId = null returns root-level documents (not in any folder).
  // parentFolderId = ?id returns documents inside that folder.
  public query ({ caller }) func listMyDocuments(parentFolderId : ?Text) : async [DocumentRecord] {
    if (caller.isAnonymous()) { return [] };
    documentRecords_v3.entries().toArray()
      .filter(func(pair : (Text, DocumentRecord)) : Bool {
        let doc = pair.1;
        if (not Principal.equal(doc.ownerPrincipal, caller)) { return false };
        switch (parentFolderId) {
          case (null) {
            // Return root-level documents (parentFolderId is null)
            switch (doc.parentFolderId) {
              case (null) { true };
              case (?_) { false };
            };
          };
          case (?fid) {
            // Return documents in the specified folder
            switch (doc.parentFolderId) {
              case (null) { false };
              case (?docFid) { docFid == fid };
            };
          };
        };
      })
      .map(func(pair : (Text, DocumentRecord)) : DocumentRecord { pair.1 });
  };

  // setDocumentPublic: toggles the isPublic flag for the caller's own document.
  public shared ({ caller }) func setDocumentPublic(documentId : Text, isPublic : Bool) : async { #ok; #err : Text } {
    if (caller.isAnonymous()) {
      return #err("Unauthorized: You must be logged in.");
    };
    switch (documentRecords_v3.get(documentId)) {
      case (null) { return #err("Document not found.") };
      case (?doc) {
        if (not Principal.equal(doc.ownerPrincipal, caller) and not isAdmin(caller)) {
          return #err("Unauthorized: You can only update your own documents.");
        };
        documentRecords_v3.add(documentId, { doc with isPublic = isPublic });
        return #ok;
      };
    };
  };

  // deleteDocument: removes document metadata and raw bytes; caller must own the document (or be admin).
  public shared ({ caller }) func deleteDocument(documentId : Text) : async { #ok; #err : Text } {
    if (caller.isAnonymous()) {
      return #err("Unauthorized: You must be logged in.");
    };
    switch (documentRecords_v3.get(documentId)) {
      case (null) { return #err("Document not found.") };
      case (?doc) {
        if (not Principal.equal(doc.ownerPrincipal, caller) and not isAdmin(caller)) {
          return #err("Unauthorized: You can only delete your own documents.");
        };
        documentRecords_v3.remove(documentId);
        fileBlobs.remove(documentId);
        return #ok;
      };
    };
  };

  // listPublicDocuments: returns all documents marked as public. No auth required.
  public query func listPublicDocuments() : async [DocumentRecord] {
    documentRecords_v3.entries().toArray()
      .filter(func(pair : (Text, DocumentRecord)) : Bool { pair.1.isPublic })
      .map(func(pair : (Text, DocumentRecord)) : DocumentRecord { pair.1 });
  };

  // getMyStorageUsed: returns total bytes used by the caller across all their documents.
  public query ({ caller }) func getMyStorageUsed() : async Nat {
    if (caller.isAnonymous()) { return 0 };
    documentRecords_v3.entries().toArray()
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

  // uploadDocumentWithData: stores raw file bytes in the canister and creates metadata.
  // Supports optional parentFolderId to place the document inside a folder.
  public shared ({ caller }) func uploadDocumentWithData(
    fileName : Text,
    fileData : [Nat8],
    mimeType : Text,
    isPublic : Bool,
    parentFolderId : ?Text,
  ) : async { #ok : DocumentRecord; #err : Text } {
    if (caller.isAnonymous()) {
      return #err("Unauthorized: You must be logged in to upload documents.");
    };

    // Check guest permission
    let role = getCallerRole(caller);
    switch (role) {
      case (#guest) {
        if (not allowGuestDocumentUpload) {
          return #err("Guest document upload is not enabled by admin.");
        };
      };
      case (_) {};
    };

    // Validate mime type (PDF, Word, images, audio, video)
    let isPdf = mimeType == "application/pdf";
    let isWord = mimeType == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      or mimeType == "application/msword";
    let isImage = mimeType == "image/jpeg" or mimeType == "image/png" or mimeType == "image/gif"
      or mimeType == "image/webp" or mimeType == "image/svg+xml";
    let isAudio = mimeType == "audio/mpeg" or mimeType == "audio/wav" or mimeType == "audio/ogg"
      or mimeType == "audio/flac" or mimeType == "audio/aac" or mimeType == "audio/x-m4a";
    let isVideo = mimeType == "video/mp4" or mimeType == "video/quicktime"
      or mimeType == "video/x-msvideo" or mimeType == "video/webm"
      or mimeType == "video/x-matroska" or mimeType == "video/mpeg";
    if (not isPdf and not isWord and not isImage and not isAudio and not isVideo) {
      return #err("File type not supported. Only PDF, Word documents, images (JPEG, PNG, GIF, WebP, SVG), audio (MP3, WAV, OGG, FLAC, AAC, M4A), and video (MP4, MOV, AVI, WebM, MKV, MPEG) are allowed.");
    };

    // Validate parentFolderId: if provided, caller must own that folder
    switch (parentFolderId) {
      case (null) {};
      case (?fid) {
        switch (folderRecords.get(fid)) {
          case (null) { return #err("Folder not found.") };
          case (?folder) {
            if (not Principal.equal(folder.ownerPrincipal, caller)) {
              return #err("Unauthorized: You can only upload into your own folders.");
            };
          };
        };
      };
    };

    // Enforce 100MB total storage limit per user
    let maxStorage : Nat = 104857600;
    let fileSize : Nat = fileData.size();
    let usedStorage = documentRecords_v3.entries().toArray()
      .filter(func(pair : (Text, DocumentRecord)) : Bool {
        Principal.equal(pair.1.ownerPrincipal, caller)
      })
      .foldLeft(0 : Nat, func(acc : Nat, pair : (Text, DocumentRecord)) : Nat {
        acc + pair.1.fileSize
      });
    if (usedStorage + fileSize > maxStorage) {
      let usedMb = usedStorage / 1048576;
      return #err("Storage limit exceeded. Used " # usedMb.toText() # " MB of 100 MB.");
    };

    let safeFileName = sanitizeFileName(fileName);
    if (textLength(safeFileName) == 0) {
      return #err("File name is required.");
    };

    // Resolve owner name from profile
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
      filePath = id; // filePath stores the docId as a plain reference
      mimeType = mimeType;
      isPublic = isPublic;
      uploadedAt = Time.now();
      fileSize = fileSize;
      parentFolderId = parentFolderId;
    };

    documentRecords_v3.add(id, doc);
    fileBlobs.add(id, fileData);
    return #ok(doc);
  };

  // getDocumentData: returns raw file bytes + metadata for download.
  // Public documents can be accessed by anyone; private documents only by their owner or an admin.
  public query ({ caller }) func getDocumentData(
    docId : Text
  ) : async { #ok : { data : [Nat8]; mimeType : Text; fileName : Text }; #err : Text } {
    switch (documentRecords_v3.get(docId)) {
      case (null) { return #err("Document not found.") };
      case (?doc) {
        // Access control: private docs require ownership or admin
        if (not doc.isPublic) {
          if (caller.isAnonymous()) {
            return #err("Unauthorized.");
          };
          if (not Principal.equal(doc.ownerPrincipal, caller) and not isAdmin(caller)) {
            return #err("Unauthorized.");
          };
        };
        switch (fileBlobs.get(docId)) {
          case (null) { return #err("Document not found.") };
          case (?bytes) {
            return #ok({ data = bytes; mimeType = doc.mimeType; fileName = doc.fileName });
          };
        };
      };
    };
  };

  // getDocumentChunk: returns a slice of raw file bytes for a given document.
  // Use this for large files (>3MB) to avoid the IC reply-size limit (IC0504).
  // Public documents can be accessed by anyone; private documents only by their owner or an admin.
  // offset: byte offset to start from; chunkSize: max number of bytes to return.
  public query ({ caller }) func getDocumentChunk(
    docId : Text,
    offset : Nat,
    chunkSize : Nat,
  ) : async { #ok : { chunk : [Nat8]; totalSize : Nat; hasMore : Bool }; #err : Text } {
    switch (documentRecords_v3.get(docId)) {
      case (null) { return #err("Document not found.") };
      case (?doc) {
        if (not doc.isPublic) {
          if (caller.isAnonymous()) {
            return #err("Unauthorized.");
          };
          if (not Principal.equal(doc.ownerPrincipal, caller) and not isAdmin(caller)) {
            return #err("Unauthorized.");
          };
        };
        switch (fileBlobs.get(docId)) {
          case (null) { return #err("Document not found.") };
          case (?bytes) {
            let totalSize = bytes.size();
            let start = offset;
            if (start >= totalSize) {
              return #ok({ chunk = []; totalSize; hasMore = false });
            };
            let end_ = Nat.min(offset + chunkSize, totalSize);
            let chunkSize_ = end_ - start;
            let chunk = Array.tabulate(chunkSize_, func(i : Nat) : Nat8 { bytes[start + i] });
            let hasMore = end_ < totalSize;
            return #ok({ chunk; totalSize; hasMore });
          };
        };
      };
    };
  };

  // ---- Chunked Upload APIs ----

  // startChunkedUpload: initiates a multi-chunk upload session.
  // Validates caller, MIME type, and storage quota before storing session metadata.
  // Returns the sessionId on success so the caller can reference it in subsequent calls.
  public shared ({ caller }) func startChunkedUpload(
    sessionId : Text,
    fileName : Text,
    mimeType : Text,
    isPublic : Bool,
    parentFolderId : ?Text,
    totalChunks : Nat,
    totalFileSize : Nat,
  ) : async { #ok : Text; #err : Text } {
    if (caller.isAnonymous()) {
      return #err("Unauthorized: You must be logged in to upload documents.");
    };

    // Check guest permission (same as uploadDocumentWithData)
    let role = getCallerRole(caller);
    switch (role) {
      case (#guest) {
        if (not allowGuestDocumentUpload) {
          return #err("Guest document upload is not enabled by admin.");
        };
      };
      case (_) {};
    };

    // Validate MIME type (same set as uploadDocumentWithData)
    let isPdf = mimeType == "application/pdf";
    let isWord = mimeType == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      or mimeType == "application/msword";
    let isImage = mimeType == "image/jpeg" or mimeType == "image/png" or mimeType == "image/gif"
      or mimeType == "image/webp" or mimeType == "image/svg+xml";
    let isAudio = mimeType == "audio/mpeg" or mimeType == "audio/wav" or mimeType == "audio/ogg"
      or mimeType == "audio/flac" or mimeType == "audio/aac" or mimeType == "audio/x-m4a";
    let isVideo = mimeType == "video/mp4" or mimeType == "video/quicktime"
      or mimeType == "video/x-msvideo" or mimeType == "video/webm"
      or mimeType == "video/x-matroska" or mimeType == "video/mpeg";
    if (not isPdf and not isWord and not isImage and not isAudio and not isVideo) {
      return #err("File type not supported. Only PDF, Word documents, images (JPEG, PNG, GIF, WebP, SVG), audio (MP3, WAV, OGG, FLAC, AAC, M4A), and video (MP4, MOV, AVI, WebM, MKV, MPEG) are allowed.");
    };

    // Validate parentFolderId ownership
    switch (parentFolderId) {
      case (null) {};
      case (?fid) {
        switch (folderRecords.get(fid)) {
          case (null) { return #err("Folder not found.") };
          case (?folder) {
            if (not Principal.equal(folder.ownerPrincipal, caller)) {
              return #err("Unauthorized: You can only upload into your own folders.");
            };
          };
        };
      };
    };

    // Enforce 100MB total storage limit per user
    let maxStorage : Nat = 104857600;
    let usedStorage = documentRecords_v3.entries().toArray()
      .filter(func(pair : (Text, DocumentRecord)) : Bool {
        Principal.equal(pair.1.ownerPrincipal, caller)
      })
      .foldLeft(0 : Nat, func(acc : Nat, pair : (Text, DocumentRecord)) : Nat {
        acc + pair.1.fileSize
      });
    if (usedStorage + totalFileSize > maxStorage) {
      let usedMb = usedStorage / 1048576;
      return #err("Storage limit exceeded. Used " # usedMb.toText() # " MB of 100 MB.");
    };

    // Resolve owner name from profile
    let ownerName = switch (userProfiles.get(caller)) {
      case (?profile) {
        if (textLength(profile.name) > 0) { profile.name } else { caller.toText() }
      };
      case (null) { caller.toText() };
    };

    let meta : ChunkedUploadMeta = {
      fileName = fileName;
      mimeType = mimeType;
      isPublic = isPublic;
      parentFolderId = parentFolderId;
      totalChunks = totalChunks;
      totalFileSize = totalFileSize;
      ownerPrincipal = caller;
      ownerName = ownerName;
    };

    pendingChunkMeta.add(sessionId, meta);
    pendingChunks.add(sessionId, Map.empty<Nat, [Nat8]>());
    return #ok(sessionId);
  };

  // uploadDocumentChunk: stores a single chunk for an in-progress upload session.
  // Caller must match the session owner. chunkIndex must be < totalChunks.
  public shared ({ caller }) func uploadDocumentChunk(
    sessionId : Text,
    chunkIndex : Nat,
    chunkData : [Nat8],
  ) : async { #ok : Text; #err : Text } {
    switch (pendingChunkMeta.get(sessionId)) {
      case (null) { return #err("Upload session not found.") };
      case (?meta) {
        if (not Principal.equal(meta.ownerPrincipal, caller)) {
          return #err("Unauthorized: You are not the owner of this upload session.");
        };
        if (chunkIndex >= meta.totalChunks) {
          return #err("Chunk index out of range.");
        };
        switch (pendingChunks.get(sessionId)) {
          case (null) { return #err("Upload session chunks not found.") };
          case (?chunkMap) {
            chunkMap.add(chunkIndex, chunkData);
            return #ok("chunk received");
          };
        };
      };
    };
  };

  // finalizeChunkedUpload: assembles all chunks into a complete file, creates the DocumentRecord,
  // stores bytes in fileBlobs, and cleans up the temporary session state.
  public shared ({ caller }) func finalizeChunkedUpload(
    sessionId : Text,
  ) : async { #ok : DocumentRecord; #err : Text } {
    switch (pendingChunkMeta.get(sessionId)) {
      case (null) { return #err("Upload session not found.") };
      case (?meta) {
        if (not Principal.equal(meta.ownerPrincipal, caller)) {
          return #err("Unauthorized: You are not the owner of this upload session.");
        };
        switch (pendingChunks.get(sessionId)) {
          case (null) { return #err("Upload session chunks not found.") };
          case (?chunkMap) {
            // Verify all expected chunks are present
            var totalChunks = meta.totalChunks;
            var i : Nat = 0;
            while (i < totalChunks) {
              switch (chunkMap.get(i)) {
                case (null) { return #err("Missing chunk " # i.toText() # " of " # totalChunks.toText() # ".") };
                case (?_) {};
              };
              i += 1;
            };

            // Concatenate all chunks in order
            var assembled : [Nat8] = [];
            var j : Nat = 0;
            while (j < totalChunks) {
              switch (chunkMap.get(j)) {
                case (null) { return #err("Chunk " # j.toText() # " missing during assembly.") };
                case (?chunk) {
                  assembled := assembled.concat(chunk);
                };
              };
              j += 1;
            };

            let safeFileName = sanitizeFileName(meta.fileName);
            if (textLength(safeFileName) == 0) {
              return #err("File name is required.");
            };

            documentIdCounter += 1;
            let id = "doc-" # documentIdCounter.toText() # "-" # Time.now().toText();

            let doc : DocumentRecord = {
              id = id;
              ownerPrincipal = caller;
              ownerName = meta.ownerName;
              fileName = safeFileName;
              filePath = id;
              mimeType = meta.mimeType;
              isPublic = meta.isPublic;
              uploadedAt = Time.now();
              fileSize = assembled.size();
              parentFolderId = meta.parentFolderId;
            };

            documentRecords_v3.add(id, doc);
            fileBlobs.add(id, assembled);

            // Clean up temporary session state
            pendingChunks.remove(sessionId);
            pendingChunkMeta.remove(sessionId);

            return #ok(doc);
          };
        };
      };
    };
  };

  // ---- Folder APIs ----

  // createFolder: creates a new folder for the caller.
  // parentFolderId = null creates a root folder; Some(id) creates a subfolder.
  public shared ({ caller }) func createFolder(name : Text, parentFolderId : ?Text) : async { #ok : Text; #err : Text } {
    if (caller.isAnonymous()) {
      return #err("Unauthorized: You must be logged in to create folders.");
    };

    let trimmedName = name.trim(#text(" "));
    if (textLength(trimmedName) == 0) {
      return #err("Folder name is required.");
    };
    if (textLength(trimmedName) > 100) {
      return #err("Folder name must be 100 characters or less.");
    };

    // Validate parentFolderId: if provided, caller must own that folder
    switch (parentFolderId) {
      case (null) {};
      case (?fid) {
        switch (folderRecords.get(fid)) {
          case (null) { return #err("Parent folder not found.") };
          case (?parent) {
            if (not Principal.equal(parent.ownerPrincipal, caller)) {
              return #err("Unauthorized: You can only create subfolders in your own folders.");
            };
          };
        };
      };
    };

    // Resolve owner name from profile
    let ownerName = switch (userProfiles.get(caller)) {
      case (?profile) {
        if (textLength(profile.name) > 0) { profile.name } else { caller.toText() }
      };
      case (null) { caller.toText() };
    };

    let folderId = "folder-" # folderIdCounter.toText() # "-" # Time.now().toText();
    folderIdCounter += 1;

    let folder : FolderRecord = {
      id = folderId;
      ownerPrincipal = caller;
      ownerName = ownerName;
      name = trimmedName;
      parentFolderId = parentFolderId;
      createdAt = Time.now();
    };

    folderRecords.add(folderId, folder);
    return #ok(folderId);
  };

  // listMyFolders: returns folders owned by the caller at a specific level.
  // parentFolderId = null returns root folders; Some(id) returns subfolders of that folder.
  public query ({ caller }) func listMyFolders(parentFolderId : ?Text) : async [FolderRecord] {
    if (caller.isAnonymous()) { return [] };
    folderRecords.entries().toArray()
      .filter(func(pair : (Text, FolderRecord)) : Bool {
        let folder = pair.1;
        if (not Principal.equal(folder.ownerPrincipal, caller)) { return false };
        switch (parentFolderId) {
          case (null) {
            switch (folder.parentFolderId) {
              case (null) { true };
              case (?_) { false };
            };
          };
          case (?fid) {
            switch (folder.parentFolderId) {
              case (null) { false };
              case (?pfid) { pfid == fid };
            };
          };
        };
      })
      .map(func(pair : (Text, FolderRecord)) : FolderRecord { pair.1 });
  };

  // deleteFolder: recursively deletes a folder, all its subfolders, and all documents inside.
  // Caller must own the folder.
  public shared ({ caller }) func deleteFolder(folderId : Text) : async { #ok : Text; #err : Text } {
    if (caller.isAnonymous()) {
      return #err("Unauthorized: You must be logged in.");
    };
    switch (folderRecords.get(folderId)) {
      case (null) { return #err("Folder not found.") };
      case (?folder) {
        if (not Principal.equal(folder.ownerPrincipal, caller) and not isAdmin(caller)) {
          return #err("Unauthorized: You can only delete your own folders.");
        };
        // Recursively delete contents
        deleteFolderContents(folderId);
        folderRecords.remove(folderId);
        return #ok("deleted");
      };
    };
  };

  // Helper: recursively deletes all subfolders and documents inside a folder.
  func deleteFolderContents(folderId : Text) {
    // Delete all documents in this folder
    let docsToDelete = documentRecords_v3.entries().toArray()
      .filter(func(pair : (Text, DocumentRecord)) : Bool {
        switch (pair.1.parentFolderId) {
          case (null) { false };
          case (?pfid) { pfid == folderId };
        };
      })
      .map(func(pair : (Text, DocumentRecord)) : Text { pair.0 });

    for (docId in docsToDelete.vals()) {
      documentRecords_v3.remove(docId);
      fileBlobs.remove(docId);
    };

    // Find and recursively delete all subfolders
    let subfoldersToDelete = folderRecords.entries().toArray()
      .filter(func(pair : (Text, FolderRecord)) : Bool {
        switch (pair.1.parentFolderId) {
          case (null) { false };
          case (?pfid) { pfid == folderId };
        };
      })
      .map(func(pair : (Text, FolderRecord)) : Text { pair.0 });

    for (subFolderId in subfoldersToDelete.vals()) {
      deleteFolderContents(subFolderId);
      folderRecords.remove(subFolderId);
    };
  };

  // moveDocument: moves a document to a different folder (or to root if targetFolderId = null).
  // Caller must own the document. If targetFolderId is non-null, caller must also own that folder.
  public shared ({ caller }) func moveDocument(docId : Text, targetFolderId : ?Text) : async { #ok : Text; #err : Text } {
    if (caller.isAnonymous()) {
      return #err("Unauthorized: You must be logged in.");
    };
    switch (documentRecords_v3.get(docId)) {
      case (null) { return #err("Document not found.") };
      case (?doc) {
        if (not Principal.equal(doc.ownerPrincipal, caller)) {
          return #err("Unauthorized: You can only move your own documents.");
        };
        // If a target folder is specified, verify the caller owns it
        switch (targetFolderId) {
          case (null) {};
          case (?fid) {
            switch (folderRecords.get(fid)) {
              case (null) { return #err("Target folder not found.") };
              case (?folder) {
                if (not Principal.equal(folder.ownerPrincipal, caller)) {
                  return #err("Unauthorized: You can only move documents into your own folders.");
                };
              };
            };
          };
        };
        documentRecords_v3.add(docId, { doc with parentFolderId = targetFolderId });
        return #ok("moved");
      };
    };
  };

  // collectDescendantFolderIds: recursively collects all descendant folder IDs of a given folder.
  // Used by moveFolder to prevent circular references.
  func collectDescendantFolderIds(folderId : Text) : [Text] {
    var result : List.List<Text> = List.empty<Text>();
    var stack : List.List<Text> = List.empty<Text>();
    stack.add(folderId);

    label processing while (true) {
      switch (stack.removeLast()) {
        case (null) { break processing };
        case (?currentId) {
          // Find all direct children of currentId
          let children = folderRecords.entries().toArray()
            .filter(func(pair : (Text, FolderRecord)) : Bool {
              switch (pair.1.parentFolderId) {
                case (null) { false };
                case (?pfid) { pfid == currentId };
              };
            })
            .map(func(pair : (Text, FolderRecord)) : Text { pair.0 });

          for (childId in children.vals()) {
            result.add(childId);
            stack.add(childId);
          };
        };
      };
    };

    result.toArray();
  };

  // moveFolder: moves a folder to a different parent folder (or to root if targetFolderId = null).
  // Caller must own the source folder. If targetFolderId is non-null, caller must also own that folder.
  // Cannot move a folder into itself or into any of its descendants (circular reference prevention).
  public shared ({ caller }) func moveFolder(folderId : Text, targetFolderId : ?Text) : async { #ok : Text; #err : Text } {
    if (caller.isAnonymous()) {
      return #err("Unauthorized: You must be logged in.");
    };

    // Verify source folder exists and caller owns it
    switch (folderRecords.get(folderId)) {
      case (null) { return #err("Folder not found.") };
      case (?sourceFolder) {
        if (not Principal.equal(sourceFolder.ownerPrincipal, caller)) {
          return #err("Unauthorized: You can only move your own folders.");
        };

        // Check target folder ownership and circular references
        switch (targetFolderId) {
          case (null) {
            // Moving to root is always safe (no circular reference possible)
          };
          case (?tid) {
            // Cannot move a folder into itself
            if (folderId == tid) {
              return #err("Cannot move a folder into itself.");
            };

            // Verify the caller owns the target folder
            switch (folderRecords.get(tid)) {
              case (null) { return #err("Target folder not found.") };
              case (?targetFolder) {
                if (not Principal.equal(targetFolder.ownerPrincipal, caller)) {
                  return #err("Unauthorized: You can only move folders into your own folders.");
                };
              };
            };

            // Prevent circular reference: target must not be a descendant of source
            let descendants = collectDescendantFolderIds(folderId);
            let isDescendant = descendants.any(func(descendantId : Text) : Bool { descendantId == tid });
            if (isDescendant) {
              return #err("Cannot move a folder into one of its own subfolders.");
            };
          };
        };

        // All checks passed — update the parentFolderId
        folderRecords.add(folderId, { sourceFolder with parentFolderId = targetFolderId });
        return #ok("moved");
      };
    };
  };

  // bulkMove: moves multiple documents and folders to a target folder in one call.
  // For each item, ownership is validated independently; failures are skipped (not aborted).
  // Returns #ok("Moved N items") where N is the count of successfully moved items.
  // Returns #err only if the caller is anonymous.
  public shared ({ caller }) func bulkMove(
    docIds : [Text],
    folderIds : [Text],
    targetFolderId : ?Text,
  ) : async { #ok : Text; #err : Text } {
    if (caller.isAnonymous()) {
      return #err("Unauthorized: You must be logged in.");
    };

    // Validate target folder ownership once (if non-null)
    switch (targetFolderId) {
      case (null) {};
      case (?tid) {
        switch (folderRecords.get(tid)) {
          case (null) { return #err("Target folder not found.") };
          case (?targetFolder) {
            if (not Principal.equal(targetFolder.ownerPrincipal, caller)) {
              return #err("Unauthorized: You can only move items into your own folders.");
            };
          };
        };
      };
    };

    var movedCount : Nat = 0;

    // Move documents
    for (docId in docIds.vals()) {
      switch (documentRecords_v3.get(docId)) {
        case (null) {}; // not found — skip
        case (?doc) {
          if (Principal.equal(doc.ownerPrincipal, caller)) {
            documentRecords_v3.add(docId, { doc with parentFolderId = targetFolderId });
            movedCount += 1;
          };
          // not owner — skip
        };
      };
    };

    // Move folders
    for (folderId in folderIds.vals()) {
      switch (folderRecords.get(folderId)) {
        case (null) {}; // not found — skip
        case (?folder) {
          if (not Principal.equal(folder.ownerPrincipal, caller)) {
            // not owner — skip
          } else {
            // Prevent circular reference: skip if target is self or a descendant
            let skip = switch (targetFolderId) {
              case (null) { false };
              case (?tid) {
                if (folderId == tid) {
                  true; // moving into itself
                } else {
                  let descendants = collectDescendantFolderIds(folderId);
                  descendants.any(func(descendantId : Text) : Bool { descendantId == tid });
                };
              };
            };
            if (not skip) {
              folderRecords.add(folderId, { folder with parentFolderId = targetFolderId });
              movedCount += 1;
            };
          };
        };
      };
    };

    return #ok("Moved " # movedCount.toText() # " items");
  };

  // ---- Notes APIs ----

  // createNote: creates a new note owned by the caller.
  public shared ({ caller }) func createNote(rubrik : Text, content : Text) : async { #ok : Text; #err : Text } {
    if (caller.isAnonymous()) {
      return #err("Unauthorized: You must be logged in to create notes.");
    };
    let trimmedRubrik = rubrik.trim(#text(" "));
    if (textLength(trimmedRubrik) == 0) {
      return #err("Note title (rubrik) is required.");
    };
    if (textLength(trimmedRubrik) > 200) {
      return #err("Note title must be 200 characters or less.");
    };
    let safeRubrik = sanitizeText(trimmedRubrik);
    let safeContent = sanitizeText(content);
    noteIdCounter += 1;
    let noteId = "note-" # noteIdCounter.toText() # "-" # Time.now().toText();
    let note : NoteRecord = {
      id = noteId;
      owner = caller;
      rubrik = safeRubrik;
      content = safeContent;
      createdAt = Time.now();
      sharedWith = [];
    };
    noteRecords.add(noteId, note);
    return #ok(noteId);
  };

  // updateNote: updates the rubrik and content of a note; only the owner can update.
  public shared ({ caller }) func updateNote(noteId : Text, rubrik : Text, content : Text) : async { #ok; #err : Text } {
    if (caller.isAnonymous()) {
      return #err("Unauthorized: You must be logged in.");
    };
    switch (noteRecords.get(noteId)) {
      case (null) { return #err("Note not found.") };
      case (?note) {
        if (not Principal.equal(note.owner, caller)) {
          return #err("Unauthorized: Only the note owner can update it.");
        };
        let trimmedRubrik = rubrik.trim(#text(" "));
        if (textLength(trimmedRubrik) == 0) {
          return #err("Note title (rubrik) is required.");
        };
        if (textLength(trimmedRubrik) > 200) {
          return #err("Note title must be 200 characters or less.");
        };
        noteRecords.add(noteId, {
          note with
          rubrik = sanitizeText(trimmedRubrik);
          content = sanitizeText(content);
        });
        return #ok;
      };
    };
  };

  // deleteNote: deletes a note; only the owner can delete.
  public shared ({ caller }) func deleteNote(noteId : Text) : async { #ok; #err : Text } {
    if (caller.isAnonymous()) {
      return #err("Unauthorized: You must be logged in.");
    };
    switch (noteRecords.get(noteId)) {
      case (null) { return #err("Note not found.") };
      case (?note) {
        if (not Principal.equal(note.owner, caller)) {
          return #err("Unauthorized: Only the note owner can delete it.");
        };
        noteRecords.remove(noteId);
        return #ok;
      };
    };
  };

  // listNotes: returns notes owned by or shared with the caller, optionally filtered by search,
  // sorted by createdAt descending, with pagination (limit/offset).
  public query ({ caller }) func listNotes(limit : Nat, offset : Nat, search : ?Text) : async { #ok : [NoteRecord]; #err : Text } {
    if (caller.isAnonymous()) {
      return #err("Unauthorized: You must be logged in.");
    };
    let searchLower : ?Text = switch (search) {
      case (null) { null };
      case (?s) {
        let trimmed = s.trim(#text(" "));
        if (textLength(trimmed) == 0) { null } else { ?trimmed.toLower() };
      };
    };
    // Collect visible notes: owned by caller OR shared with caller
    let all = noteRecords.entries().toArray()
      .filter(func(pair : (Text, NoteRecord)) : Bool {
        let note = pair.1;
        let isOwner = Principal.equal(note.owner, caller);
        let isShared = note.sharedWith.any(func(p : Principal) : Bool {
          Principal.equal(p, caller)
        });
        if (not isOwner and not isShared) { return false };
        // Apply search filter
        switch (searchLower) {
          case (null) { true };
          case (?term) {
            note.rubrik.toLower().contains(#text(term)) or
            note.content.toLower().contains(#text(term))
          };
        };
      })
      .map(func(pair : (Text, NoteRecord)) : NoteRecord { pair.1 });

    // Sort by createdAt descending
    let sorted = all.sort(func(a : NoteRecord, b : NoteRecord) : { #less; #equal; #greater } {
      Int.compare(b.createdAt, a.createdAt)
    });

    // Apply pagination
    let total = sorted.size();
    let start : Int = offset.toInt();
    let end_ : Int = (offset + limit).toInt();
    let page = sorted.sliceToArray(start, if (end_ > total.toInt()) { total.toInt() } else { end_ });
    return #ok(page);
  };

  // getNotesCount: returns total count of notes visible to the caller (owned + shared), with optional search.
  public query ({ caller }) func getNotesCount(search : ?Text) : async { #ok : Nat; #err : Text } {
    if (caller.isAnonymous()) {
      return #err("Unauthorized: You must be logged in.");
    };
    let searchLower : ?Text = switch (search) {
      case (null) { null };
      case (?s) {
        let trimmed = s.trim(#text(" "));
        if (textLength(trimmed) == 0) { null } else { ?trimmed.toLower() };
      };
    };
    let count = noteRecords.entries().toArray()
      .filter(func(pair : (Text, NoteRecord)) : Bool {
        let note = pair.1;
        let isOwner = Principal.equal(note.owner, caller);
        let isShared = note.sharedWith.any(func(p : Principal) : Bool {
          Principal.equal(p, caller)
        });
        if (not isOwner and not isShared) { return false };
        switch (searchLower) {
          case (null) { true };
          case (?term) {
            note.rubrik.toLower().contains(#text(term)) or
            note.content.toLower().contains(#text(term))
          };
        };
      })
      .size();
    return #ok(count);
  };

  // shareNote: shares a note with a target principal; only the owner can share.
  // Prevents duplicates; max 50 shares per note.
  public shared ({ caller }) func shareNote(noteId : Text, targetPrincipal : Principal) : async { #ok; #err : Text } {
    if (caller.isAnonymous()) {
      return #err("Unauthorized: You must be logged in.");
    };
    switch (noteRecords.get(noteId)) {
      case (null) { return #err("Note not found.") };
      case (?note) {
        if (not Principal.equal(note.owner, caller)) {
          return #err("Unauthorized: Only the note owner can share it.");
        };
        if (Principal.equal(targetPrincipal, caller)) {
          return #err("Cannot share a note with yourself.");
        };
        // Prevent duplicate shares
        let alreadyShared = note.sharedWith.any(func(p : Principal) : Bool {
          Principal.equal(p, targetPrincipal)
        });
        if (alreadyShared) {
          return #err("Note is already shared with this principal.");
        };
        if (note.sharedWith.size() >= 50) {
          return #err("Cannot share with more than 50 principals.");
        };
        noteRecords.add(noteId, {
          note with
          sharedWith = note.sharedWith.concat([targetPrincipal]);
        });
        return #ok;
      };
    };
  };

  // unshareNote: removes a principal from the sharedWith list; only the owner can unshare.
  public shared ({ caller }) func unshareNote(noteId : Text, targetPrincipal : Principal) : async { #ok; #err : Text } {
    if (caller.isAnonymous()) {
      return #err("Unauthorized: You must be logged in.");
    };
    switch (noteRecords.get(noteId)) {
      case (null) { return #err("Note not found.") };
      case (?note) {
        if (not Principal.equal(note.owner, caller)) {
          return #err("Unauthorized: Only the note owner can unshare it.");
        };
        let updated = note.sharedWith.filter(func(p : Principal) : Bool {
          not Principal.equal(p, targetPrincipal)
        });
        noteRecords.add(noteId, { note with sharedWith = updated });
        return #ok;
      };
    };
  };

  // getNoteShares: returns the sharedWith list for a note; only the owner can call.
  public query ({ caller }) func getNoteShares(noteId : Text) : async { #ok : [Principal]; #err : Text } {
    if (caller.isAnonymous()) {
      return #err("Unauthorized: You must be logged in.");
    };
    switch (noteRecords.get(noteId)) {
      case (null) { return #err("Note not found.") };
      case (?note) {
        if (not Principal.equal(note.owner, caller)) {
          return #err("Unauthorized: Only the note owner can view shares.");
        };
        return #ok(note.sharedWith);
      };
    };
  };

  // --> Admin operations, USED ONLY WITH CANDID UI, DO NOT USE admin_* operations in front-end

  // recordMyAccess: called by frontend after login to record an access event.
  // Keeps at most 50 entries per user (oldest dropped first).
  public shared ({ caller }) func recordMyAccess(metadata : Text) : async () {
    if (caller.isAnonymous()) { return };
    // Ensure every logged-in user appears in listUsers() so admins can view their access log.
    // If this caller is not yet in userRoles, register them as #guest.
    if (userRoles.get(caller) == null) {
      userRoles.add(caller, #guest);
    };
    let ts = Time.now();
    let entryId = caller.toText() # "-" # ts.toText();
    let entry : UserAccessLogEntry = {
      id = entryId;
      timestamp = ts;
      metadata = metadata;
    };
    let existing : [UserAccessLogEntry] = switch (userAccessLogs.get(caller)) {
      case (?entries) { entries };
      case (null) { [] };
    };
    // Append new entry; if over 50, drop the oldest (first element)
    let maxEntries : Nat = 50;
    let appended = existing.concat([entry]);
    let trimmed : [UserAccessLogEntry] = if (appended.size() > maxEntries) {
      appended.sliceToArray(appended.size() - maxEntries, appended.size())
    } else {
      appended
    };
    userAccessLogs.add(caller, trimmed);
  };

  // getUserAccessLog: admin-only — returns the access log for a target principal.
  public query ({ caller }) func getUserAccessLog(target : Principal) : async { #ok : [UserAccessLogEntry]; #err : Text } {
    if (not isAdmin(caller)) {
      return #err("Unauthorized");
    };
    let entries = switch (userAccessLogs.get(target)) {
      case (?e) { e };
      case (null) { [] };
    };
    return #ok(entries);
  };

  // clearUserAccessLog: admin-only — clears all log entries for a target principal.
  public shared ({ caller }) func clearUserAccessLog(target : Principal) : async { #ok; #err : Text } {
    if (not isAdmin(caller)) {
      return #err("Unauthorized");
    };
    userAccessLogs.add(target, []);
    return #ok;
  };

  // deleteUserAccessLogEntries: admin-only — removes specific entries by id from a target's log.
  public shared ({ caller }) func deleteUserAccessLogEntries(target : Principal, entryIds : [Text]) : async { #ok; #err : Text } {
    if (not isAdmin(caller)) {
      return #err("Unauthorized");
    };
    let existing : [UserAccessLogEntry] = switch (userAccessLogs.get(target)) {
      case (?entries) { entries };
      case (null) { [] };
    };
    let filtered = existing.filter(func(e : UserAccessLogEntry) : Bool {
      not entryIds.any(func(id : Text) : Bool { id == e.id })
    });
    userAccessLogs.add(target, filtered);
    return #ok;
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
