class SignInResponse {
  final bool success;
  final String message;
  final SignInResponseData? data;

  SignInResponse({
    required this.success,
    required this.message,
    this.data,
  });

  factory SignInResponse.fromJson(Map<String, dynamic> json) {
    return SignInResponse(
      success: json['success'] == true,
      message: json['message']?.toString() ?? '',
      data: json['data'] != null ? SignInResponseData.fromJson(json['data']) : null,
    );
  }
}

class SignInResponseData {
  final int userId;
  final String email;
  final int roleId;
  final String roleName;
  final bool requiresMfa;
  final bool mustChangePassword;

  SignInResponseData({
    required this.userId,
    required this.email,
    required this.roleId,
    required this.roleName,
    required this.requiresMfa,
    required this.mustChangePassword,
  });

  factory SignInResponseData.fromJson(Map<String, dynamic> json) {
    return SignInResponseData(
      userId: json['user_id'] is int ? json['user_id'] : int.parse(json['user_id']?.toString() ?? '0'),
      email: json['email']?.toString() ?? '',
      roleId: json['role_id'] is int ? json['role_id'] : int.parse(json['role_id']?.toString() ?? '1'),
      roleName: json['role_name']?.toString() ?? 'User',
      requiresMfa: json['requires_mfa'] == true,
      mustChangePassword: json['must_change_password'] == true,
    );
  }
}
