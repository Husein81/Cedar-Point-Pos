import { Icon, Shad } from "../components";

type Props = {
  title?: string;
  description?: string;
  icon?: string;
};

export const Empty = ({ title, description, icon }: Props) => {
  return (
    <Shad.Empty>
      <Shad.EmptyMedia>
        <Icon name={icon ? icon : "Box"} className="w-12 h-12 text-gray-400" />
      </Shad.EmptyMedia>
      <Shad.EmptyTitle>{title ? title : "No Data Available"}</Shad.EmptyTitle>
      <Shad.EmptyDescription>
        {description
          ? description
          : "There is no data to display at the moment."}
      </Shad.EmptyDescription>
    </Shad.Empty>
  );
};
