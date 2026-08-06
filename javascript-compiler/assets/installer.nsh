; Custom NSIS hooks for JS Compiler.
;
; electron-builder already removes a previously installed version before it
; installs a new one: it reads the uninstall entry from the registry, copies
; that old uninstaller to a temp folder and runs it silently with --updated,
; which keeps the user's snippets and settings. What it does not do when the
; installer is launched by hand is close a running copy of the app — it stops
; and asks. An upgrade should not need that question.
;
; Defining customCheckAppRunning replaces the stock check entirely: when this
; macro exists, electron-builder skips including getProcessInfo.nsh and the
; $pid variable, so everything here must be self-contained (FIND_PROCESS and
; nsProcess are always available).

!macro customCheckAppRunning
  !insertmacro FIND_PROCESS "${APP_EXECUTABLE_FILENAME}" $R0
  ${if} $R0 == 0
    DetailPrint `Closing running "${PRODUCT_NAME}"...`

    ; Ask it to exit first so it can flush open work to disk
    !ifdef INSTALL_MODE_PER_ALL_USERS
      nsExec::Exec `taskkill /im "${APP_EXECUTABLE_FILENAME}"`
    !else
      nsExec::Exec `"$SYSDIR\cmd.exe" /c taskkill /im "${APP_EXECUTABLE_FILENAME}" /fi "USERNAME eq %USERNAME%"`
    !endif
    Sleep 1500

    StrCpy $R1 0
    jsc_wait_loop:
      !insertmacro FIND_PROCESS "${APP_EXECUTABLE_FILENAME}" $R0
      ${if} $R0 != 0
        Goto jsc_closed
      ${endIf}

      IntOp $R1 $R1 + 1
      ${if} $R1 > 4
        ; Still alive after several tries — most likely running elevated,
        ; which this installer cannot terminate. Hand it back to the user.
        MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "$(appCannotBeClosed)" /SD IDCANCEL IDRETRY jsc_retry
        Quit
        jsc_retry:
          StrCpy $R1 0
      ${endIf}

      ; Escalate to a forced close, then give Windows time to release the files
      !ifdef INSTALL_MODE_PER_ALL_USERS
        nsExec::Exec `taskkill /f /im "${APP_EXECUTABLE_FILENAME}"`
      !else
        nsExec::Exec `"$SYSDIR\cmd.exe" /c taskkill /f /im "${APP_EXECUTABLE_FILENAME}" /fi "USERNAME eq %USERNAME%"`
      !endif
      Sleep 1500
      Goto jsc_wait_loop

    jsc_closed:
    ; Files can stay locked for a moment after the process is gone
    Sleep 500
  ${endIf}
!macroend

!macro customInstall
  ; Record the installed version so support can tell what a machine is on
  WriteRegStr SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}" "InstalledVersion" "${VERSION}"
!macroend

!macro customUnInstall
  ${ifNot} ${isUpdated}
    ; A real uninstall, not an upgrade, should not leave our registry mark
    DeleteRegValue SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}" "InstalledVersion"
  ${endIf}
!macroend
