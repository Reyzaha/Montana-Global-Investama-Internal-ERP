// ignore_for_file: always_specify_types, use_build_context_synchronously, always_put_required_named_parameters_first, cascade_invocations

import "package:basic_utils/basic_utils.dart";
import "package:flutter/material.dart";
import "../overlay/base_overlays.dart";
import "dimensions.dart";

class Dialogs {
  static Future<void> message({
    required BuildContext buildContext,
    required String title,
    String? message,
    String? dismiss,
    bool showButton = true,
    bool cancelable = true,
  }) {
    Widget? content;

    if (message != null) {
      content = SingleChildScrollView(
        child: Text(message),
      );
    }

    List<Widget> actions = [];

    if (showButton) {
      actions.add(
        TextButton(
          child: Text(dismiss ?? "Mengerti"),
          onPressed: () => Navigator.of(buildContext).pop(),
        ),
      );
    }

    return showDialog(
      context: buildContext,
      barrierDismissible: cancelable,
      builder: (BuildContext buildContext) {
        return AlertDialog(
          title: Text(title),
          content: content,
          actions: actions,
        );
      },
    );
  }

  static Future<void> confirmation({
    required BuildContext context,
    required String title,
    String? message,
    String? negative,
    String? positive,
    bool cancelable = true,
    VoidCallback? negativeCallback,
    VoidCallback? positiveCallback,
  }) {
    Widget? content;

    if (message != null) {
      content = SingleChildScrollView(
        child: Text(message),
      );
    }

    return showDialog(
      context: context,
      barrierDismissible: cancelable,
      builder: (BuildContext buildContext) {
        return AlertDialog(
          title: Text(title),
          content: content,
          actions: [
            TextButton(
              child: Text(negative ?? "Tidak"),
              onPressed: () {
                Navigator.of(buildContext).pop();

                if (negativeCallback != null) {
                  negativeCallback.call();
                }
              },
            ),
            TextButton(
              child: Text(positive ?? "Iya"),
              onPressed: () {
                Navigator.of(buildContext).pop();

                if (positiveCallback != null) {
                  positiveCallback.call();
                }
              },
            ),
          ],
        );
      },
    );
  }

  static Future<void> reason({
    required BuildContext context,
    required String title,
    String? message,
    String? negative,
    String? positive,
    bool cancelable = true,
    VoidCallback? negativeCallback,
    required void Function(String reason) positiveCallback,
  }) {
    return showDialog(
      context: context,
      builder: (context) {
        final TextEditingController textEditingController = TextEditingController();

        List<Widget> contents = [
          Text(
            title,
            style: const TextStyle(
              fontSize: 18,
            ),
          ),
        ];

        if (StringUtils.isNotNullOrEmpty(message)) {
          contents.add(
            SizedBox(
              height: Dimensions.size5,
            ),
          );

          contents.add(
            Text(
              message!,
              style: const TextStyle(
                fontSize: 14,
              ),
            ),
          );
        }

        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: contents,
              ),
              content: TextFormField(
                controller: textEditingController,
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                ),
                maxLines: 3,
              ),
              actions: [
                TextButton(
                  child: Text(negative ?? "Tutup"),
                  onPressed: () {
                    Navigator.of(context).pop();

                    if (negativeCallback != null) {
                      negativeCallback.call();
                    }
                  },
                ),
                TextButton(
                  child: Text(positive ?? "Kirim"),
                  onPressed: () {
                    if (textEditingController.text.isNotEmpty) {
                      Navigator.of(context).pop();

                      positiveCallback.call(textEditingController.text);
                    } else {
                      BaseOverlays.error(message: "Alasan pembatalan harus diisi");
                    }
                  },
                ),
              ],
            );
          },
        );
      },
    );
  }

}
