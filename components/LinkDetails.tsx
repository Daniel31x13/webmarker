import React, { useEffect, useState } from "react";
import {
  LinkIncludingShortenedCollectionAndTags,
  ArchivedFormat,
} from "@/types/global";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  pdfAvailable,
  readabilityAvailable,
  monolithAvailable,
  screenshotAvailable,
  previewAvailable,
} from "@/lib/shared/getArchiveValidity";
import PreservedFormatRow from "@/components/PreserverdFormatRow";
import getPublicUserData from "@/lib/client/getPublicUserData";
import { useTranslation } from "next-i18next";
import { BeatLoader } from "react-spinners";
import { useUser } from "@/hooks/store/user";
import { useGetLink } from "@/hooks/store/links";
import LinkIcon from "./LinkViews/LinkComponents/LinkIcon";
import CopyButton from "./CopyButton";
import { useRouter } from "next/router";
import Icon from "./Icon";
import { IconWeight } from "@phosphor-icons/react";
import Image from "next/image";
import clsx from "clsx";

type Props = {
  className?: string;
  link: LinkIncludingShortenedCollectionAndTags;
  standalone?: boolean;
};

export default function LinkDetails({ className, link, standalone }: Props) {
  const { t } = useTranslation();
  const session = useSession();
  const getLink = useGetLink();
  const { data: user = {} } = useUser();

  const [collectionOwner, setCollectionOwner] = useState({
    id: null as unknown as number,
    name: "",
    username: "",
    image: "",
    archiveAsScreenshot: undefined as unknown as boolean,
    archiveAsMonolith: undefined as unknown as boolean,
    archiveAsPDF: undefined as unknown as boolean,
  });

  useEffect(() => {
    const fetchOwner = async () => {
      if (link.collection.ownerId !== user.id) {
        const owner = await getPublicUserData(
          link.collection.ownerId as number
        );
        setCollectionOwner(owner);
      } else if (link.collection.ownerId === user.id) {
        setCollectionOwner({
          id: user.id as number,
          name: user.name,
          username: user.username as string,
          image: user.image as string,
          archiveAsScreenshot: user.archiveAsScreenshot as boolean,
          archiveAsMonolith: user.archiveAsScreenshot as boolean,
          archiveAsPDF: user.archiveAsPDF as boolean,
        });
      }
    };

    fetchOwner();
  }, [link.collection.ownerId]);

  const isReady = () => {
    return (
      link &&
      (collectionOwner.archiveAsScreenshot === true
        ? link.pdf && link.pdf !== "pending"
        : true) &&
      (collectionOwner.archiveAsMonolith === true
        ? link.monolith && link.monolith !== "pending"
        : true) &&
      (collectionOwner.archiveAsPDF === true
        ? link.pdf && link.pdf !== "pending"
        : true) &&
      link.readable &&
      link.readable !== "pending"
    );
  };

  const atLeastOneFormatAvailable = () => {
    return (
      screenshotAvailable(link) ||
      pdfAvailable(link) ||
      readabilityAvailable(link) ||
      monolithAvailable(link)
    );
  };

  useEffect(() => {
    (async () => {
      await getLink.mutateAsync({
        id: link.id as number,
      });
    })();

    let interval: any;

    if (!isReady()) {
      interval = setInterval(async () => {
        await getLink.mutateAsync({
          id: link.id as number,
        });
      }, 5000);
    } else {
      if (interval) {
        clearInterval(interval);
      }
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [link?.monolith]);

  const router = useRouter();

  const isPublicRoute = router.pathname.startsWith("/public") ? true : false;

  return (
    <div className={clsx(className)} data-vaul-no-drag>
      <div
        className={clsx(
          standalone && "sm:border sm:border-neutral-content sm:rounded-2xl p-5"
        )}
      >
        <div
          className={clsx(
            "overflow-hidden select-none relative h-32 opacity-80 bg-opacity-80",
            standalone
              ? "sm:max-w-xl -mx-5 -mt-5 sm:rounded-t-2xl"
              : "-mx-4 -mt-4"
          )}
        >
          {previewAvailable(link) ? (
            <Image
              src={`/api/v1/archives/${link.id}?format=${ArchivedFormat.jpeg}&preview=true`}
              width={1280}
              height={720}
              alt=""
              className="object-cover scale-105"
              style={{
                filter: "blur(1px)",
              }}
              onError={(e) => {
                const target = e.target as HTMLElement;
                target.style.display = "none";
              }}
            />
          ) : link.preview === "unavailable" ? (
            <div className="bg-gray-50 duration-100 h-32"></div>
          ) : (
            <div className="duration-100 h-32 skeleton rounded-b-none"></div>
          )}
          <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center rounded-md">
            <LinkIcon link={link} />
          </div>
        </div>

        <div className="max-w-xl sm:px-8 p-5 pb-8 pt-2">
          {link.name && <p className="text-xl text-center mt-2">{link.name}</p>}

          {link.url && (
            <>
              <br />

              <p className="text-sm mb-2 text-neutral">{t("link")}</p>

              <div className="relative">
                <div className="rounded-lg p-2 bg-base-200 hide-scrollbar overflow-x-auto whitespace-nowrap flex justify-between items-center gap-2 pr-14">
                  <Link href={link.url} title={link.url} target="_blank">
                    {link.url}
                  </Link>
                  <div className="absolute right-0 px-2 bg-base-200">
                    <CopyButton text={link.url} />
                  </div>
                </div>
              </div>
            </>
          )}

          <br />

          <p className="text-sm mb-2 text-neutral">{t("collection")}</p>

          <div className="relative">
            <Link
              href={
                isPublicRoute
                  ? `/public/collections/${link.collection.id}`
                  : `/collections/${link.collection.id}`
              }
              className="rounded-lg p-2 bg-base-200 hide-scrollbar overflow-x-auto whitespace-nowrap flex justify-between items-center gap-2 pr-14"
            >
              <p>{link.collection.name}</p>
              <div className="absolute right-0 px-2 bg-base-200">
                {link.collection.icon ? (
                  <Icon
                    icon={link.collection.icon}
                    size={30}
                    weight={
                      (link.collection.iconWeight || "regular") as IconWeight
                    }
                    color={link.collection.color || "#0ea5e9"}
                  />
                ) : (
                  <i
                    className="bi-folder-fill text-2xl"
                    style={{ color: link.collection.color || "#0ea5e9" }}
                  ></i>
                )}
              </div>
            </Link>
          </div>

          {link.tags[0] && (
            <>
              <br />

              <div>
                <p className="text-sm mb-2 text-neutral">{t("tags")}</p>
              </div>

              <div className="flex gap-2 flex-wrap">
                {link.tags.map((tag) =>
                  isPublicRoute ? (
                    <div
                      key={tag.id}
                      className="rounded-lg px-3 py-1 bg-base-200"
                    >
                      {tag.name}
                    </div>
                  ) : (
                    <Link
                      href={"/tags/" + tag.id}
                      key={tag.id}
                      className="rounded-lg px-3 py-1 bg-base-200"
                    >
                      {tag.name}
                    </Link>
                  )
                )}
              </div>
            </>
          )}

          {link.description && (
            <>
              <br />

              <div>
                <p className="text-sm mb-2 text-neutral">{t("notes")}</p>

                <div className="rounded-lg p-2 bg-base-200 hyphens-auto">
                  <p>{link.description}</p>
                </div>
              </div>
            </>
          )}

          <br />

          <p
            className="text-sm mb-2 text-neutral"
            title={t("available_formats")}
          >
            {link.url ? t("preserved_formats") : t("file")}
          </p>

          <div className={`flex flex-col gap-3`}>
            {monolithAvailable(link) ? (
              <PreservedFormatRow
                name={t("webpage")}
                icon={"bi-filetype-html"}
                format={ArchivedFormat.monolith}
                link={link}
                downloadable={true}
              />
            ) : undefined}

            {screenshotAvailable(link) ? (
              <PreservedFormatRow
                name={t("screenshot")}
                icon={"bi-file-earmark-image"}
                format={
                  link?.image?.endsWith("png")
                    ? ArchivedFormat.png
                    : ArchivedFormat.jpeg
                }
                link={link}
                downloadable={true}
              />
            ) : undefined}

            {pdfAvailable(link) ? (
              <PreservedFormatRow
                name={t("pdf")}
                icon={"bi-file-earmark-pdf"}
                format={ArchivedFormat.pdf}
                link={link}
                downloadable={true}
              />
            ) : undefined}

            {readabilityAvailable(link) ? (
              <PreservedFormatRow
                name={t("readable")}
                icon={"bi-file-earmark-text"}
                format={ArchivedFormat.readability}
                link={link}
              />
            ) : undefined}

            {!isReady() && !atLeastOneFormatAvailable() ? (
              <div
                className={`w-full h-full flex flex-col justify-center p-10`}
              >
                <BeatLoader
                  color="oklch(var(--p))"
                  className="mx-auto mb-3"
                  size={30}
                />

                <p className="text-center text-2xl">
                  {t("preservation_in_queue")}
                </p>
                <p className="text-center text-lg">{t("check_back_later")}</p>
              </div>
            ) : link.url && !isReady() && atLeastOneFormatAvailable() ? (
              <div className={`w-full h-full flex flex-col justify-center p-5`}>
                <BeatLoader
                  color="oklch(var(--p))"
                  className="mx-auto mb-3"
                  size={20}
                />
                <p className="text-center">{t("there_are_more_formats")}</p>
                <p className="text-center text-sm">{t("check_back_later")}</p>
              </div>
            ) : undefined}

            {link.url && (
              <Link
                href={`https://web.archive.org/web/${link?.url?.replace(
                  /(^\w+:|^)\/\//,
                  ""
                )}`}
                target="_blank"
                className="text-neutral mx-auto duration-100 hover:opacity-60 flex gap-2 w-1/2 justify-center items-center text-sm"
              >
                <p className="whitespace-nowrap">{t("view_latest_snapshot")}</p>
                <i className="bi-box-arrow-up-right" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
