// ignore_for_file: cascade_invocations, always_specify_types, avoid_print, non_constant_identifier_names, depend_on_referenced_packages, unused_import

import "dart:convert";
import "dart:io";
import "package:cookie_jar/cookie_jar.dart";
import "package:dio/dio.dart";
import "package:flutter/foundation.dart";
import "package:dio_cookie_manager/dio_cookie_manager.dart";
import "package:jiffy/jiffy.dart";
import "package:path_provider/path_provider.dart";

import "../constant.dart";
import "../helper/formats.dart";
import "endpoint/sign_in/sign_in_request.dart";

class ApiManager {
  static bool PRIMARY = true;
  static PersistCookieJar? _cookieJar;

  static Future<CookieJar> getCookieJar() async {
    if (_cookieJar == null) {
      final Directory appDocDir = await getApplicationDocumentsDirectory();
      _cookieJar = PersistCookieJar(
        ignoreExpires: true,
        storage: FileStorage('${appDocDir.path}/.mgi_cookies/'),
      );
    }
    return _cookieJar!;
  }

  static Future<Dio> getDio({
    bool plain = false,
  }) async {
    String baseUrl;

    if (PRIMARY) {
      if (!kIsWeb && Platform.isAndroid) {
        baseUrl = ApiUrl.MAIN_BASE;
      } else {
        baseUrl = 'http://localhost/Montana-Global-Investama-ERP';
      }
    } else {
      baseUrl = ApiUrl.SECONDARY_BASE;
    }

    Dio dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        contentType: Headers.jsonContentType,
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        responseDecoder: (responseBytes, options, responseBody) {
          if (plain) {
            options.responseType = ResponseType.plain;
          }

          return utf8.decode(responseBytes, allowMalformed: true);
        },
      ),
    );

    // Integrasi CookieManager untuk mempertahankan sesi PHPSESSID backend PHP
    final cookieJar = await getCookieJar();
    dio.interceptors.add(CookieManager(cookieJar));
    dio.interceptors.add(LogInterceptor(requestBody: true, responseBody: true));

    return dio;
  }

  Future<Uint8List> download({
    required String url,
  }) async {
    Response response = await Dio()
        .get(url, options: Options(responseType: ResponseType.bytes));

    return response.data;
  }

  static Future<Response> account() async {
    Dio dio = await getDio();

    Response response = await dio.get(
      ApiUrl.ACCOUNT.path,
    );

    return response;
  }

  static Future<Response> signIn({
    required SignInRequest signInRequest,
  }) async {
    Dio dio = await getDio();

    Response response = await dio.post(
      ApiUrl.SIGN_IN.path,
      data: Formats.convert(signInRequest.toJson()),
    );

    return response;
  }

  static Future<Response> verifyOtp({
    required String otp,
  }) async {
    Dio dio = await getDio();

    Response response = await dio.post(
      ApiUrl.VERIFY_OTP.path,
      data: {'otp': otp},
    );

    return response;
  }

  static Future<Response> signOut() async {
    Dio dio = await getDio();

    Response response = await dio.get(
      ApiUrl.SIGN_OUT.path,
    );

    final cj = await getCookieJar();
    await cj.deleteAll();

    return response;
  }

  // Presensi GPS
  static Future<Response> getAttendanceSettings() async {
    Dio dio = await getDio();
    return dio.get(ApiUrl.ATTENDANCE_SETTINGS.path);
  }

  static Future<Response> checkIn({required double lat, required double lng, String? notes}) async {
    Dio dio = await getDio();
    return dio.post(ApiUrl.CHECK_IN.path, data: {'latitude': lat, 'longitude': lng, 'notes': notes});
  }

  static Future<Response> checkOut({required double lat, required double lng, String? notes}) async {
    Dio dio = await getDio();
    return dio.post(ApiUrl.CHECK_OUT.path, data: {'latitude': lat, 'longitude': lng, 'notes': notes});
  }

  static Future<Response> getMyAttendance({required int month, required int year}) async {
    Dio dio = await getDio();
    return dio.get('${ApiUrl.MY_ATTENDANCE.path}?month=$month&year=$year');
  }

  // Permit & Cuti
  static Future<Response> getPermitTypes() async {
    Dio dio = await getDio();
    return dio.get(ApiUrl.PERMIT_TYPES.path);
  }

  static Future<Response> getPermitSubTypes({int categoryId = 0, String status = 'active'}) async {
    Dio dio = await getDio();
    String url = '${ApiUrl.PERMIT_SUB_TYPES.path}?status=$status';
    if (categoryId > 0) url += '&category_id=$categoryId';
    return dio.get(url);
  }

  static Future<Response> getPermits({String? status}) async {
    Dio dio = await getDio();
    String url = ApiUrl.PERMITS.path;
    if (status != null && status.isNotEmpty) url += '?status=$status';
    return dio.get(url);
  }

  static Future<Response> submitPermit(FormData formData) async {
    Dio dio = await getDio();
    return dio.post(ApiUrl.PERMITS.path, data: formData);
  }

  static Future<Response> approvePermit({required int id, String note = ''}) async {
    Dio dio = await getDio();
    return dio.post('${ApiUrl.PERMIT_APPROVE.path}?id=$id', data: {'note': note});
  }

  static Future<Response> rejectPermit({required int id, String note = ''}) async {
    Dio dio = await getDio();
    return dio.post('${ApiUrl.PERMIT_REJECT.path}?id=$id', data: {'note': note});
  }

  static Future<Response> manageSubType(Map<String, dynamic> data) async {
    Dio dio = await getDio();
    return dio.post(ApiUrl.PERMIT_SUB_TYPES.path, data: data);
  }

  static Future<Response> getLeaveBalance() async {
    Dio dio = await getDio();
    return dio.get(ApiUrl.LEAVE_BALANCE.path);
  }
}
