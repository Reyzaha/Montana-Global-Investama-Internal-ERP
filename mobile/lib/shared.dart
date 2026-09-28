// ignore_for_file: non_constant_identifier_names
import 'package:flutter/material.dart';
import 'api/model/account.dart';

class Shared {
  static final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

  static BuildContext? get currentContext => navigatorKey.currentContext;

  static Account? ACCOUNT;
}
