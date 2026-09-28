
import '../../api/endpoint/sign_in/sign_in_request.dart';

abstract class SignInEvent {}

class SignInSubmit extends SignInEvent {
  final SignInRequest signInRequest;

  SignInSubmit({
    required this.signInRequest,
  });
}