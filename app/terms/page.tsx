import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_URL, LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of service · Ride Buddy",
  description: "The simple rules for using Ride Buddy.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service">
      <section>
        <p>
          Ride Buddy is a free community app for motorcycle riders, built as a hackathon project. By using it, you agree to
          these terms. Please also read our <Link href="/privacy">Privacy policy</Link>.
        </p>
      </section>

      <section>
        <h2>Ride safely: it&apos;s your responsibility</h2>
        <ul>
          <li>
            Ride Buddy helps you find people to ride with. It <strong>does not verify</strong> riders, their identity, skill,
            licence or bikes, and it can&apos;t guarantee anyone is safe to ride with.
          </li>
          <li>Meet new people in public places, tell someone where you&apos;re going, and ride within your limits.</li>
          <li>Follow traffic laws and wear proper riding gear. Don&apos;t use the app while riding.</li>
          <li>
            Distances, routes and match suggestions are for information only and may be inaccurate. Don&apos;t rely on them for
            navigation or safety decisions.
          </li>
        </ul>
      </section>

      <section>
        <h2>Your account</h2>
        <ul>
          <li>You must be 18 or older to use Ride Buddy.</li>
          <li>Use your real name or a nickname, keep your sign-in secure, and don&apos;t impersonate anyone.</li>
        </ul>
      </section>

      <section>
        <h2>What you post</h2>
        <ul>
          <li>You own what you post. You let Ride Buddy show it to other riders in the app so the community works.</li>
          <li>
            Don&apos;t post anything illegal, hateful, harassing, sexually explicit, or that promotes dangerous riding (such as
            street racing).
          </li>
          <li>Don&apos;t share other people&apos;s private information or exact locations without their permission.</li>
          <li>No spam, scams or selling.</li>
          <li>We may remove content or accounts that break these rules.</li>
        </ul>
      </section>

      <section>
        <h2>The service</h2>
        <ul>
          <li>
            Ride Buddy is a hackathon project provided &ldquo;as is&rdquo;. Features may change, be unavailable, or stop, and
            data could be lost. Keep copies of anything important.
          </li>
          <li>
            Some riders, posts and groups are fictional demo content, always labelled <strong>Demo</strong>.
          </li>
          <li>
            AI features (reading your description, ranking matches and drafting intros) can make mistakes. Check suggestions
            before you rely on them.
          </li>
          <li>
            To the extent the law allows, Ride Buddy and its makers aren&apos;t responsible for rides, meetings or anything
            that happens between riders who met through the app.
          </li>
        </ul>
      </section>

      <section>
        <h2>Leaving</h2>
        <p>
          You can stop using Ride Buddy at any time and delete your data from <strong>Profile → Edit profile</strong>. See the{" "}
          <Link href="/privacy">Privacy policy</Link> for details.
        </p>
      </section>

      <section>
        <h2>Changes and contact</h2>
        <p>
          We may update these terms; the date at the top will change when we do. Questions:{" "}
          <a href={CONTACT_URL}>open an issue on the project&apos;s GitHub page</a>.
        </p>
      </section>
    </LegalPage>
  );
}
