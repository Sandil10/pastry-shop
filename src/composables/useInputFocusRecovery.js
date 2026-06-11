import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';

export const preventRestoreOnce = () => {
    window.__lastFocusedInput = null;
    window.__isRecoveringFocus = false;
    window.__skipFocusRestoreUntil = Date.now() + 350;
};

export function useInputFocusRecovery() {
    const lastInput = ref(null);
    const isTyping = ref(false);
    const isPointerInteracting = ref(false);
    const watchdog = ref(null);
    let pointerTimer = null;

    const isTextInput = (el) => {
        if (!el) return false;
        const tag = el.tagName?.toLowerCase();
        return (
            tag === 'input' ||
            tag === 'textarea' ||
            el.isContentEditable
        );
    };

    const isInteractiveElement = (el) => {
        if (!el) return false;
        const tag = el.tagName?.toLowerCase();
        return (
            tag === 'button' ||
            tag === 'a' ||
            tag === 'select' ||
            tag === 'option' ||
            tag === 'input' ||
            tag === 'textarea' ||
            el.isContentEditable ||
            Boolean(el.closest?.('button, a, select, [role="button"], [data-no-focus-restore]'))
        );
    };

    const saveFocusedInput = (e) => {
        const target = e.target;
        if (isTextInput(target) && !target.disabled && !target.readOnly) {
            lastInput.value = target;
            isTyping.value = true;
            window.__lastFocusedInput = target;
        }
    };

    const isSystemFocusing = ref(false);

    const forceCaretRedraw = (el) => {
        if (!el || !document.contains(el)) return;
        if (isSystemFocusing.value) return; // Don't trigger if already working
        
        isSystemFocusing.value = true;
        try {
            const originalColor = el.style.caretColor;
            el.style.caretColor = 'transparent';
            
            el.blur();
            setTimeout(() => {
                if (el && document.contains(el)) {
                    el.focus();
                    el.style.caretColor = originalColor || 'auto';
                    
                    // DOM SHAKE TRICK: Force OS caret repaint by modifying value temporarily
                    const oldVal = el.value || '';
                    if (el.tagName === 'INPUT' && !el.readOnly) {
                        el.value = oldVal + ' '; 
                        el.value = oldVal;
                    }

                    if (typeof el.selectionStart === 'number') {
                        const len = el.value?.length || 0;
                        el.setSelectionRange(len, len);
                    }
                    setTimeout(() => { isSystemFocusing.value = false; }, 100);
                } else {
                    isSystemFocusing.value = false;
                }
            }, 50);
        } catch (err) {
            console.warn('Caret recovery failed', err);
            isSystemFocusing.value = false;
        }
    };

    const restoreFocus = async () => {
        if (Date.now() < (window.__skipFocusRestoreUntil || 0)) return;
        if (isPointerInteracting.value) return;
        if (window.__isRecoveringFocus || isSystemFocusing.value) return;
        
        window.__isRecoveringFocus = true;
        await nextTick();
        
        let el = lastInput.value || window.__lastFocusedInput;
        
        if (!el || !document.contains(el)) {
            el = document.querySelector('input:not([type="hidden"]):not([disabled]):not([readonly])');
        }

        if (el && document.contains(el)) {
            const active = document.activeElement;
            const isLost = !active || active === document.body;
            
            if (isLost && !isInteractiveElement(active)) {
                forceCaretRedraw(el);
            }
        }
        
        window.__isRecoveringFocus = false;
    };

    const handleFocus = (e) => saveFocusedInput(e);
    const handleBlur = () => {
        if (isSystemFocusing.value) return; // IGNORE BLURS CAUSED BY OUR OWN SYSTEM
        handleUnexpectedBlur();
    };

    const handleUnexpectedBlur = () => {
        if (isPointerInteracting.value) return;
        setTimeout(() => {
            if (!isSystemFocusing.value) restoreFocus();
        }, 250);
    };

    const markPointerInteraction = () => {
        isPointerInteracting.value = true;
        window.__skipFocusRestoreUntil = Date.now() + 300;
        if (pointerTimer) clearTimeout(pointerTimer);
        pointerTimer = setTimeout(() => {
            isPointerInteracting.value = false;
        }, 300);
    };

    // 4. Manual Recovery / Electron Events
    if (window.electronAPI && window.electronAPI.onWindowRefocused) {
        window.electronAPI.onWindowRefocused(() => {
            setTimeout(restoreFocus, 50);
        });
    }

    const handleGlobalKeyDown = (e) => {
        // If user is trying to type (alphanumeric keys) and no input is focused
        const active = document.activeElement;
        const isNotTyping = !active || (active === document.body);
        
        const isAlphanumeric = e.key.length === 1; // Basic char keys
        
        if (isNotTyping && isAlphanumeric) {
            restoreFocus();
        }
    };

    onMounted(() => {
        if (window.__inputFocusRecoveryMounted) return;
        window.__inputFocusRecoveryMounted = true;

        document.addEventListener('focusin', saveFocusedInput, true);
        document.addEventListener('pointerdown', markPointerInteraction, true);
        document.addEventListener('focusout', handleUnexpectedBlur, true);
        document.addEventListener('keydown', handleGlobalKeyDown, true);
        window.addEventListener('focus', restoreFocus);

        watchdog.value = setInterval(() => {
            const active = document.activeElement;
            const isLost = (!active || active === document.body) && !isPointerInteracting.value;
            if (isLost) {
                restoreFocus();
            }
        }, 1500);

        onBeforeUnmount(() => {
            window.__inputFocusRecoveryMounted = false;
            clearInterval(watchdog.value);
            clearTimeout(pointerTimer);
            document.removeEventListener('focusin', saveFocusedInput, true);
            document.removeEventListener('pointerdown', markPointerInteraction, true);
            document.removeEventListener('focusout', handleUnexpectedBlur, true);
            document.removeEventListener('keydown', handleGlobalKeyDown, true);
            window.removeEventListener('focus', restoreFocus);
        });
    });

    return {
        isTyping,
        restoreFocus
    };
}
