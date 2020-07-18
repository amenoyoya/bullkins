<?php
require_once(__DIR__ . '/$common.php');
$csrf = generateCSRF();
?>

<?= component('header', ['title' => 'ログイン', 'bodyattr' => 'class="hold-transition login-page"'])?>
    <div id="app" class="login-box">
        <div class="login-logo">
            <a href="/"><b>Admin</b>LTE</a>
        </div>

        <div class="login-box-body">
            <p class="login-box-msg">ログインしてください。</p>
            
            <div class="alert alert-danger" v-if="form_error">
                <p>{{ form_error }}</p>
            </div>
            
            <form @submit.prevent="login">
                <div :class="'form-group has-feedback' + (form_error_id? ' has-error': '')">
                    <label for="id">Login ID:</label>
                    <input id="id" type="text" class="form-control" placeholder="YourID" v-model="form_id">
                    <span class="glyphicon glyphicon-envelope form-control-feedback"></span>
                    <div class="m-1 px-2 color-palette bg-secondary" v-if="form_error_id">
                        <p>{{ form_error_id }}</p>
                    </div>
                </div>

                <div :class="'form-group has-feedback' + (form_error_password? ' has-error': '')">
                    <label for="password">Password:</label>
                    <input id="password" type="password" class="form-control" placeholder="Password" v-model="form_password">
                    <span class="glyphicon glyphicon-lock form-control-feedback"></span>
                    <div class="m-1 px-2 color-palette bg-secondary" v-if="form_error_password">
                        <p>{{ form_error_password }}</p>
                    </div>
                </div>
                <div class="form-group">
                    <button type="submit" class="btn btn-primary btn-block btn-flat">ログイン</button>
                </div>
            </form>
        </div>
    </div>
<?php
$script = <<<EOS
<script>
new Vue({
    el: '#app',
    data: function() {
        return {
            csrf_token: '$csrf',
            form_id: '',
            form_password: '',
            form_error: '',
            form_error_id: '',
            form_error_password: '',
        };
    },
    methods: {
        login: function() {
            var vm = this;

            vm.form_error = '';
            vm.form_error_id = '';
            vm.form_error_password = '';

            axios.post(
                '/api/login/',
                {
                    id: vm.form_id,
                    password: vm.form_password,
                },
                {
                    headers: {
                        'X-Csrf-Token': vm.csrf_token,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                },
            ).catch(function(err) {
                vm.form_error = 'サーバエラーが発生しました';
            }).then(function(res) {
                if (res.data.status) {
                    // ログイン成功
                    // redirectパラメータがあるならそのページに移動
                    var params = getUrlParameters();
                    if (params.redirect) {
                        location.href = decodeURIComponent(params.redirect);
                    } else {
                        // redirect 先がないなら top に移動
                        location.href = '/';
                    }
                } else {
                    vm.form_error_id = res.data.errors.id? res.data.errors.id[0]: '';
                    vm.form_error_password = res.data.errors.password? res.data.errors.password[0]: '';
                }
            });
        }
    }
});
</script>
EOS;
?>
<?= component('footer', ['script' => $script]) ?>