import { Compare } from "@/components/ui/compare";
import { SparklesText } from "@/components/ui/sparkles-text";
import { VoiceFeedback } from "@/components/ui/voice-feedback";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-8 items-center justify-center min-h-[calc(100vh-130px)]">
      <SparklesText 
        text="Coupn" 
        colors={{ first: "#FF5733", second: "#33FF57" }}
        className="text-4xl md:text-6xl"
      />
      <div className="p-4 border rounded-3xl dark:bg-neutral-900 bg-neutral-100 border-neutral-200 dark:border-neutral-800">
        <Compare
          firstImage="/before.png"
          secondImage="/after.png"
          firstImageClassName="object-cover object-left-top"
          secondImageClassName="object-cover object-left-top"
          className="h-[300px] w-[350px] md:h-[600px] md:w-[1000px]"
          slideMode="hover"
        />
      </div>
      <div className="text-center mt-4 text-sm text-neutral-600 dark:text-neutral-400">
        Never lose out on promotional deals again.
      </div>
    </div>
  );
}
