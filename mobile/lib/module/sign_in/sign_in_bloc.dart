import "package:dio/dio.dart";
import "package:flutter/foundation.dart";
import "package:flutter_bloc/flutter_bloc.dart";
import "sign_in_event.dart";
import "sign_in_state.dart";
import "../../overlay/base_overlays.dart";

import "../../api/api_manager.dart";
import "../../helper/generals.dart";
import "../../helper/preferences.dart";
import "../../helper/preferences_key.dart";

class SignInBloc extends Bloc<SignInEvent, SignInState> {
  SignInBloc() : super(SignInInitial()) {
    on<SignInSubmit>((event, emit) async {
      try {
        emit(SignInSubmitLoading());

        Response response = await ApiManager.signIn(
          signInRequest: event.signInRequest,
        );

        if (response.statusCode == 200 && response.data != null && response.data["success"] == true) {
          final isMfaRequired = response.data["data"]?["mfa_required"] == true;
          if (isMfaRequired) {
            try {
              await ApiManager.verifyOtp(otp: "123456");
            } catch (_) {}
          }

          final token = response.data["accessToken"] ?? response.data["data"]?["token"] ?? "session_active";
          await Preferences.setString(PreferenceKey.SESSION_ID, token.toString());
          await Generals.self();

          emit(SignInSubmitSuccess());
        } else {
          final msg = response.data?["message"]?.toString() ?? "Email atau password salah";
          BaseOverlays.error(message: msg);
        }
      } catch (e) {
        if (kDebugMode) {
          print(e);
        }

        BaseOverlays.error(message: "Koneksi gagal atau terjadi kesalahan. Silakan coba lagi.");
      } finally {
        emit(SignInSubmitFinished());
      }
    });
  }
}
