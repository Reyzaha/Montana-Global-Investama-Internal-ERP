class SignInRequest {
  final String email;
  final String password;

  SignInRequest({
    required this.email,
    required this.password,
  });

  Map<String, dynamic> toJson() {
    return {
      'email': email,
      'password': password,
    };
  }

  factory SignInRequest.fromJson(Map<String, dynamic> json) {
    return SignInRequest(
      email: json['email']?.toString() ?? '',
      password: json['password']?.toString() ?? '',
    );
  }
}
