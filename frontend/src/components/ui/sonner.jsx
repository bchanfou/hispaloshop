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
        theme="dark"
        className="toaster group"
        position="top-center"
        toastOptions={{
          duration: 3000,
          classNames: {
            toast:
              "group toast group-[.toaster]:bg-stone-950 group-[.toaster]:text-white group-[.toaster]:border-stone-800 group-[.toaster]:shadow-lg group-[.toaster]:rounded-2xl group-[.toaster]:pointer-events-auto group-[.toaster]:text-sm group-[.toaster]:font-sans",
            description: "group-[.toast]:text-stone-300",
            actionButton:
              "group-[.toast]:bg-white group-[.toast]:text-stone-950",
            cancelButton:
              "group-[.toast]:bg-stone-800 group-[.toast]:text-stone-300",
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
