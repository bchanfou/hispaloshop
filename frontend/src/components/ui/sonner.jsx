import { Toaster as Sonner, toast } from "sonner"

/**
 * Mobile-safe Toaster — prevents notification freeze on mobile:
 * 1. Container has pointer-events: none via CSS !important
 * 2. Individual toasts have pointer-events: auto
 * 3. Short duration to minimize blocking time
 * 4. CSS override ensures Sonner's internal wrapper doesn't block
 */
const Toaster = ({ ...props }) => {
  return (
    <>
      <style>{`
        [data-sonner-toaster] {
          pointer-events: none !important;
        }
        [data-sonner-toaster] > * {
          pointer-events: none !important;
        }
        [data-sonner-toast] {
          pointer-events: auto !important;
        }
      `}</style>
      <Sonner
        theme="light"
        className="toaster group"
        position="top-center"
        toastOptions={{
          duration: 3000,
          classNames: {
            toast:
              "group toast group-[.toaster]:bg-white group-[.toaster]:text-primary group-[.toaster]:border-stone-200 group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl group-[.toaster]:pointer-events-auto group-[.toaster]:text-sm",
            description: "group-[.toast]:text-text-muted",
            actionButton:
              "group-[.toast]:bg-primary group-[.toast]:text-white",
            cancelButton:
              "group-[.toast]:bg-stone-100 group-[.toast]:text-text-muted",
          },
        }}
        containerStyle={{
          pointerEvents: 'none',
          zIndex: 9990,
        }}
        {...props}
      />
    </>
  );
}

export { Toaster, toast }
