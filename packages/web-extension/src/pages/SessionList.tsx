import { useEffect, useMemo, useState } from 'react';
import {
  chakra,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Flex,
  Checkbox,
  Button,
  Spacer,
} from '@chakra-ui/react';
import {
  createColumnHelper,
  useReactTable,
  flexRender,
  getCoreRowModel,
  SortingState,
  getSortedRowModel,
} from '@tanstack/react-table';
import { VscTriangleDown, VscTriangleUp } from 'react-icons/vsc';
import { LocalData, LocalDataKey, Session } from '../types';
import Browser from 'webextension-polyfill';
import { useNavigate } from 'react-router-dom';

const columnHelper = createColumnHelper<Session>();

export function SessionList() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: 'createTimestamp',
      desc: true,
    },
  ]);
  const [rowSelection, setRowSelection] = useState({});

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            isChecked={table.getIsAllRowsSelected()}
            isIndeterminate={table.getIsSomeRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            isChecked={row.getIsSelected()}
            isIndeterminate={row.getIsSomeSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
      }),
      columnHelper.accessor((row) => row.name, {
        cell: (info) => info.getValue(),
        header: 'Name',
      }),
      columnHelper.accessor((row) => row.createTimestamp, {
        id: 'createTimestamp',
        cell: (info) => new Date(info.getValue()).toLocaleString(),
        header: 'Created Time',
        sortDescFirst: true,
      }),
      columnHelper.accessor((row) => row.recorderVersion, {
        cell: (info) => info.getValue(),
        header: 'RRWEB Version',
      }),
    ],
    [],
  );
  const table = useReactTable<Session>({
    columns,
    data: sessions,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
      rowSelection,
    },
  });

  useEffect(() => {
    const getSessions = (sessions?: LocalData['sessions']) => {
      if (!sessions) return;
      const sessionArray = [];
      for (const id in sessions) sessionArray.push(sessions[id]);
      setSessions(sessionArray);
    };
    void Browser.storage.local
      .get(LocalDataKey.sessions)
      .then((data) => getSessions((data as LocalData).sessions));
    Browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.sessions)
        getSessions(changes.sessions.newValue as LocalData['sessions']);
    });
  }, []);

  return (
    <>
      <TableContainer fontSize="md">
        <Table variant="simple">
          <Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as
                    | {
                        isNumeric: boolean;
                      }
                    | undefined;
                  return (
                    <Th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      isNumeric={meta?.isNumeric}
                      verticalAlign="center"
                      userSelect="none"
                    >
                      <Flex align="center">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        <chakra.span pl={4}>
                          {{
                            asc: (
                              <VscTriangleUp aria-label="sorted ascending" />
                            ),
                            desc: (
                              <VscTriangleDown aria-label="sorted descending" />
                            ),
                          }[header.column.getIsSorted() as string] ?? null}
                        </chakra.span>
                      </Flex>
                    </Th>
                  );
                })}
              </Tr>
            ))}
          </Thead>
          <Tbody>
            {table.getRowModel().rows.map((row) => (
              <Tr key={row.id} _hover={{ cursor: 'pointer' }}>
                {row.getVisibleCells().map((cell, index) => {
                  const meta = cell.column.columnDef.meta as
                    | {
                        isNumeric: boolean;
                      }
                    | undefined;
                  return (
                    <Td
                      key={cell.id}
                      isNumeric={meta?.isNumeric}
                      onClick={() => {
                        if (index !== 0)
                          navigate(`/session/${row.original.id}`);
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </Td>
                  );
                })}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
      <Flex mt={4}>
        <Spacer />
        <Button
          mr={4}
          colorScheme="red"
          onClick={() => {
            if (table.getSelectedRowModel().flatRows.length === 0) return;
            void Browser.storage.local
              .get(LocalDataKey.sessions)
              .then((data) => {
                const sessions = (data as LocalData).sessions;
                if (!sessions) return;
                for (const row of table.getSelectedRowModel().flatRows)
                  delete sessions[row.original.id];
                return Browser.storage.local.set({ sessions });
              })
              .then(() => {
                setRowSelection({});
              });
          }}
        >
          Delete
        </Button>
      </Flex>
    </>
  );
}
