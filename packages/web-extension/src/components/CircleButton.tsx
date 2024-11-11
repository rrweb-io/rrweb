import { Button, ButtonProps } from '@chakra-ui/react';

interface CircleButtonProps extends ButtonProps {
  diameter: number;
  onClick?: () => void;
  children?: React.ReactNode;
  title?: string;
}

export function CircleButton({
  diameter,
  onClick,
  children,
  title,
  ...rest
}: CircleButtonProps) {
  return (
    <Button
      w={`${diameter}rem`}
      h={`${diameter}rem`}
      padding={`${diameter / 2}rem`}
      borderRadius={9999}
      textAlign="center"
      bgColor="gray.100"
      boxSizing="content-box"
      onClick={onClick}
      title={title}
      {...rest}
    >
      {children}
    </Button>
  );
}
