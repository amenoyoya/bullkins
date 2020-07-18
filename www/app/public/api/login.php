<?php
require_once(__DIR__ . '/../$common.php');
middleware('formpost'); // フォームPOST受信

// JSONレスポンス
header('Content-Type: application/json');

echo json_encode((function() {
    $json = $_POST['<JSON>'];
    $res = ['errors' => []];
    if (empty($json['id'])) {
        $res['errors']['id'][] = 'IDは必須です';
    }
    if (empty($json['password'])) {
        $res['errors']['password'][] = 'パスワードは必須です';
    }
    // Authentication
    switch (auth($json['id'], $json['password'])) {
    case AUTH_NOT_EXISTS:
        $res['errors']['id'][] = '存在しないIDです';
        break;
    case AUTH_PASSWORD_WRONG:
        $res['errors']['password'][] = 'パスワードが違います';
        break;
    }
    // return json
    $res['status'] = empty($res['errors']);
    return $res;
})());
