class Account {
  final int id;
  final String email;
  final String name;
  final int roleId;
  final String roleName;
  final String? photoPath;
  final bool mfaVerified;
  final bool mustChangePassword;

  Account({
    required this.id,
    required this.email,
    required this.name,
    required this.roleId,
    required this.roleName,
    this.photoPath,
    this.mfaVerified = false,
    this.mustChangePassword = false,
  });

  Account.empty()
      : id = 0,
        email = '',
        name = '',
        roleId = 1,
        roleName = 'User',
        photoPath = null,
        mfaVerified = false,
        mustChangePassword = false;

  static Account parse(dynamic data) {
    if (data is Map<String, dynamic>) {
      if (data.containsKey('data') && data['data'] is Map<String, dynamic>) {
        return Account.fromJson(data['data'] as Map<String, dynamic>);
      }
      return Account.fromJson(data);
    }
    return Account.empty();
  }

  bool get isHRGA => roleId == 2 || roleId == 7;
  bool get isPM => roleId == 6 || roleId == 7;
  bool get isAdmin => roleId == 7;

  factory Account.fromJson(Map<String, dynamic> json) {
    return Account(
      id: json['id'] is int ? json['id'] : int.parse(json['id']?.toString() ?? '0'),
      email: json['email']?.toString() ?? '',
      name: json['name']?.toString() ?? 'User',
      roleId: json['role_id'] is int ? json['role_id'] : int.parse(json['role_id']?.toString() ?? '1'),
      roleName: json['role_name']?.toString() ?? 'User',
      photoPath: json['photo_path']?.toString(),
      mfaVerified: json['mfa_verified'] == true || json['mfa_verified'] == 1,
      mustChangePassword: json['must_change_password'] == true || json['must_change_password'] == 1,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'role_id': roleId,
      'role_name': roleName,
      'photo_path': photoPath,
      'mfa_verified': mfaVerified,
      'must_change_password': mustChangePassword,
    };
  }
}
