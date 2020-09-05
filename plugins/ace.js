import Vue from 'vue'
import AceEditor from 'vue2-ace-editor'
// language extension prerequsite...
import 'brace/ext/language_tools'
import 'brace/mode/html'
import 'brace/mode/css'
import 'brace/mode/sass'
import 'brace/mode/javascript'
import 'brace/mode/json'
import 'brace/mode/less'
// themes
import 'brace/theme/tomorrow'
import 'brace/theme/tomorrow_night_eighties'
// snippet
// import 'brace/snippets/javascript'

Vue.component('AceEditor', AceEditor)