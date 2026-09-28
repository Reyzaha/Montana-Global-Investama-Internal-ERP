// ignore_for_file: always_specify_types

import "package:basic_utils/basic_utils.dart";
import "package:flutter/material.dart";
import "package:get/get.dart";

class Navigators {
  static GlobalKey<NavigatorState> sideSheetNavigatorState = GlobalKey<NavigatorState>();

  static Future<T?> push<T extends Object?>(Widget widget, {
    BuildContext? context,
  }) {
    context ??= Get.context;

    if (context != null) {
      return Navigator.of(context).push(
        MaterialPageRoute(
          settings: RouteSettings(
            name: widget.runtimeType.toString(),
          ),
          builder: (BuildContext context) {
            return widget;
          },
        ),
      );
    }

    return Future.value();
  }

  static void pushReplacement(Widget widget, {
    BuildContext? context,
  }) {
    context ??= Get.context;

    if (context != null) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          settings: RouteSettings(
            name: widget.runtimeType.toString(),
          ),
          builder: (materialContext) {
            return widget;
          },
        ),
      );
    }
  }

  static void pushAndRemoveAll(Widget widget, {
    BuildContext? context,
  }) {
    context ??= Get.context;

    if (context != null) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(
          settings: RouteSettings(
            name: widget.runtimeType.toString(),
          ),
          builder: (BuildContext context) {
            return widget;
          },
        ), (Route route) => false,
      );
    }
  }

  static void pop({
    BuildContext? context,
    dynamic result,
  }) {
    BuildContext? currentContext = context ?? Get.context;

    if (currentContext != null) {
      if (currentContext == context && !Navigator.of(currentContext).canPop()) {
        pop(result: result);
      }

      if (Navigator.of(currentContext).canPop()) {
        Navigator.of(currentContext).pop(result);
      }
    }
  }

  static void popAll({
    BuildContext? context,
  }) {
    context ??= Get.context;

    if (context != null) {
      Navigator.of(context).popUntil((Route route) => route.isFirst);
    }
  }

  static void popUntil(String name, {
    BuildContext? context,
  }) {
    context ??= Get.context;

    if (context != null) {
      Navigator.of(context).popUntil((Route route) => StringUtils.equalsIgnoreCase(route.settings.name ?? "", name));
    }
  }

  static bool canPop({
    BuildContext? context,
  }) {
    context ??= Get.context;

    if (context != null) {
      return Navigator.of(context).canPop();
    }

    return false;
  }
}
